import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { randomBytes } from "crypto"
import { getBotDatabase, isBotConfigured, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"
import { BOT_TOKENS } from "@/lib/discord"
import { writeAuditLog } from "@/lib/audit-log"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"

// Verify user has permission to manage webhooks for this guild
async function verifyWebhookPermission(guildId: string): Promise<{ allowed: boolean; userId?: string; username?: string }> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")
  
  if (!sessionCookie) {
    return { allowed: false }
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    const username = session.user?.username
    
    if (!userId) {
      return { allowed: false }
    }
    
    // Master admins can manage all guilds
    if (session.isAdmin === true || isMasterUser(userId)) {
      return { allowed: true, userId, username }
    }
    
    const botId = "syruprx" as BotId
    const botToken = BOT_TOKENS[botId]
    if (!botToken) {
      return { allowed: false }
    }
    
    // Check ownerUserIds from database
    if (isBotConfigured(botId)) {
      const db = await getBotDatabase(botId)
      if (db) {
        const dashboardConfig = await db.collection("configs").findOne({ guildId })
        const ownerUserIds: string[] = dashboardConfig?.config?.ownerUserIds || []
        if (ownerUserIds.includes(userId)) {
          return { allowed: true, userId, username }
        }
      }
    }
    
    // Check if user is guild owner via bot token
    const guildResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    )
    
    if (guildResponse.ok) {
      const guildData = await guildResponse.json()
      if (guildData.owner_id === userId) {
        return { allowed: true, userId, username }
      }
    }
    
    return { allowed: false }
  } catch {
    return { allowed: false }
  }
}

// GET /api/webhooks/rx?guildId=... - Get webhook config for a guild
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get("guildId")

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "Guild ID is required" },
        { status: 400 }
      )
    }

    const botId = "syruprx" as BotId
    if (!isBotConfigured(botId)) {
      return NextResponse.json({
        success: false,
        error: "Bot database not configured",
      })
    }

    const { allowed } = await verifyWebhookPermission(guildId)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to manage webhooks for this guild" },
        { status: 403 }
      )
    }

    const db = await getBotDatabase(botId)
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Failed to connect to database" },
        { status: 500 }
      )
    }

    const webhook = await db.collection("webhooks").findOne({ guildId })

    if (!webhook) {
      return NextResponse.json({
        success: true,
        webhook: null,
      })
    }

    // Mask discord webhook URL (show only last 20 chars)
    const maskedDiscordUrl = webhook.discordWebhookUrl
      ? "••••••••" + webhook.discordWebhookUrl.slice(-20)
      : null

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.webhookId,
        guildId: webhook.guildId,
        rxWebhookUrl: `${getBaseUrl(request)}/api/webhooks/rx/incoming/${webhook.webhookId}`,
        discordWebhookUrl: maskedDiscordUrl,
        hasDiscordWebhook: !!webhook.discordWebhookUrl,
        enabled: webhook.enabled !== false,
        createdAt: webhook.createdAt,
        lastUsedAt: webhook.lastUsedAt,
        totalLogs: webhook.totalLogs || 0,
      },
    })
  } catch (error) {
    console.error("Failed to fetch webhook:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch webhook" },
      { status: 500 }
    )
  }
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

// POST /api/webhooks/rx - Generate a new webhook for a guild
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { guildId, discordWebhookUrl } = body

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "Guild ID is required" },
        { status: 400 }
      )
    }

    // Validate discord webhook URL if provided
    if (discordWebhookUrl && !discordWebhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      return NextResponse.json(
        { success: false, error: "Invalid Discord webhook URL. Must start with https://discord.com/api/webhooks/" },
        { status: 400 }
      )
    }

    const botId = "syruprx" as BotId
    if (!isBotConfigured(botId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
      )
    }

    const { allowed, userId, username } = await verifyWebhookPermission(guildId)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to manage webhooks for this guild" },
        { status: 403 }
      )
    }

    const db = await getBotDatabase(botId)
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Failed to connect to database" },
        { status: 500 }
      )
    }

    // Check if webhook already exists for this guild
    const existing = await db.collection("webhooks").findOne({ guildId })
    
    if (existing) {
      // Update existing webhook (regenerate ID)
      const webhookId = randomBytes(24).toString("hex")
      
      await db.collection("webhooks").updateOne(
        { guildId },
        {
          $set: {
            webhookId,
            discordWebhookUrl: discordWebhookUrl || existing.discordWebhookUrl || null,
            enabled: true,
            updatedAt: new Date().toISOString(),
            updatedBy: username || "unknown",
          },
        }
      )

      // Audit log
      if (userId) {
        writeAuditLog(botId, {
          botId,
          guildId,
          action: "webhook_regenerated",
          category: "config",
          details: { hasDiscordWebhook: !!discordWebhookUrl },
          executedBy: {
            id: userId,
            username: username || "unknown",
          },
          success: true,
        }).catch(() => {})
      }

      const rxUrl = `${getBaseUrl(request)}/api/webhooks/rx/incoming/${webhookId}`

      return NextResponse.json({
        success: true,
        message: "Webhook regenerated successfully. Update the URL in your Maple server.",
        webhook: {
          id: webhookId,
          guildId,
          rxWebhookUrl: rxUrl,
          hasDiscordWebhook: !!discordWebhookUrl || !!existing.discordWebhookUrl,
          enabled: true,
        },
      })
    }

    // Create new webhook
    const webhookId = randomBytes(24).toString("hex")
    
    await db.collection("webhooks").insertOne({
      webhookId,
      guildId,
      discordWebhookUrl: discordWebhookUrl || null,
      enabled: true,
      totalLogs: 0,
      createdAt: new Date().toISOString(),
      createdBy: username || "unknown",
    })

    // Ensure indexes
    await db.collection("webhooks").createIndex({ webhookId: 1 }, { unique: true }).catch(() => {})
    await db.collection("webhooks").createIndex({ guildId: 1 }, { unique: true }).catch(() => {})

    // Audit log
    if (userId) {
      writeAuditLog(botId, {
        botId,
        guildId,
        action: "webhook_created",
        category: "config",
        details: { hasDiscordWebhook: !!discordWebhookUrl },
        executedBy: {
          id: userId,
          username: username || "unknown",
        },
        success: true,
      }).catch(() => {})
    }

    const rxUrl = `${getBaseUrl(request)}/api/webhooks/rx/incoming/${webhookId}`

    return NextResponse.json({
      success: true,
      message: "Webhook created successfully. Add the RX Webhook URL to your Maple server.",
      webhook: {
        id: webhookId,
        guildId,
        rxWebhookUrl: rxUrl,
        hasDiscordWebhook: !!discordWebhookUrl,
        enabled: true,
      },
    })
  } catch (error) {
    console.error("Failed to create webhook:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create webhook" },
      { status: 500 }
    )
  }
}

// PUT /api/webhooks/rx - Update webhook settings (discord URL, enabled)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { guildId, discordWebhookUrl, enabled } = body

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "Guild ID is required" },
        { status: 400 }
      )
    }

    // Validate discord webhook URL if provided and not clearing
    if (discordWebhookUrl && discordWebhookUrl !== "" && !discordWebhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      return NextResponse.json(
        { success: false, error: "Invalid Discord webhook URL" },
        { status: 400 }
      )
    }

    const botId = "syruprx" as BotId
    if (!isBotConfigured(botId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
      )
    }

    const { allowed, userId, username } = await verifyWebhookPermission(guildId)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to manage webhooks for this guild" },
        { status: 403 }
      )
    }

    const db = await getBotDatabase(botId)
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Failed to connect to database" },
        { status: 500 }
      )
    }

    const existing = await db.collection("webhooks").findOne({ guildId })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "No webhook found for this guild. Generate one first." },
        { status: 404 }
      )
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: username || "unknown",
    }

    if (discordWebhookUrl !== undefined) {
      // If it's a masked value, keep the existing
      if (discordWebhookUrl.startsWith("••••••••")) {
        // Don't update - keep existing
      } else {
        updateFields.discordWebhookUrl = discordWebhookUrl || null
      }
    }

    if (enabled !== undefined) {
      updateFields.enabled = enabled
    }

    await db.collection("webhooks").updateOne(
      { guildId },
      { $set: updateFields }
    )

    // Audit log
    if (userId) {
      writeAuditLog(botId, {
        botId,
        guildId,
        action: "webhook_updated",
        category: "config",
        details: {
          updatedFields: Object.keys(updateFields).filter(k => k !== "updatedAt" && k !== "updatedBy"),
        },
        executedBy: {
          id: userId,
          username: username || "unknown",
        },
        success: true,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: "Webhook settings updated.",
    })
  } catch (error) {
    console.error("Failed to update webhook:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update webhook" },
      { status: 500 }
    )
  }
}

// DELETE /api/webhooks/rx - Delete webhook for a guild
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get("guildId")

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "Guild ID is required" },
        { status: 400 }
      )
    }

    const botId = "syruprx" as BotId
    if (!isBotConfigured(botId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
      )
    }

    const { allowed, userId, username } = await verifyWebhookPermission(guildId)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to manage webhooks for this guild" },
        { status: 403 }
      )
    }

    const db = await getBotDatabase(botId)
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Failed to connect to database" },
        { status: 500 }
      )
    }

    await db.collection("webhooks").deleteOne({ guildId })
    // Optionally clean up logs too (keep them for now)

    // Audit log
    if (userId) {
      writeAuditLog(botId, {
        botId,
        guildId,
        action: "webhook_deleted",
        category: "config",
        details: {},
        executedBy: {
          id: userId,
          username: username || "unknown",
        },
        success: true,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: "Webhook deleted successfully.",
    })
  } catch (error) {
    console.error("Failed to delete webhook:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete webhook" },
      { status: 500 }
    )
  }
}
