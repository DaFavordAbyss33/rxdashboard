import { NextResponse } from "next/server"
import { cookies } from "next/headers"
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
    
    if (session.isAdmin === true || isMasterUser(userId)) {
      return { allowed: true, userId, username }
    }
    
    const botId = "syruprx" as BotId
    const botToken = BOT_TOKENS[botId]
    if (!botToken) {
      return { allowed: false }
    }
    
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

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook._id.toString(),
        guildId: webhook.guildId,
        channelId: webhook.channelId,
        enabled: webhook.enabled !== false,
        createdAt: webhook.createdAt,
        lastSyncedAt: webhook.lastSyncedAt || null,
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

// POST /api/webhooks/rx - Save channel config for a guild
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { guildId, channelId } = body

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "Guild ID is required" },
        { status: 400 }
      )
    }

    if (!channelId || !/^\d{17,20}$/.test(channelId)) {
      return NextResponse.json(
        { success: false, error: "A valid Discord channel ID is required" },
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

    // Verify bot can actually read messages from that channel
    const botToken = BOT_TOKENS[botId]
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: "Bot token not configured" },
        { status: 500 }
      )
    }

    const channelCheck = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    )

    if (!channelCheck.ok) {
      return NextResponse.json(
        { success: false, error: "Cannot access that channel. Make sure the SyrupRx bot has Read Message History permission in the channel." },
        { status: 400 }
      )
    }

    const channelData = await channelCheck.json()
    // Verify the channel belongs to the right guild
    if (channelData.guild_id !== guildId) {
      return NextResponse.json(
        { success: false, error: "That channel does not belong to this server" },
        { status: 400 }
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

    if (existing) {
      await db.collection("webhooks").updateOne(
        { guildId },
        {
          $set: {
            channelId,
            enabled: true,
            updatedAt: new Date().toISOString(),
            updatedBy: username || "unknown",
          },
        }
      )
    } else {
      await db.collection("webhooks").insertOne({
        guildId,
        channelId,
        enabled: true,
        totalLogs: 0,
        lastSyncedAt: null,
        lastMessageId: null,
        createdAt: new Date().toISOString(),
        createdBy: username || "unknown",
      })

      await db.collection("webhooks").createIndex({ guildId: 1 }, { unique: true }).catch(() => {})
    }

    if (userId) {
      writeAuditLog(botId, {
        botId,
        guildId,
        action: existing ? "webhook_channel_updated" : "webhook_created",
        category: "config",
        details: { channelId },
        executedBy: {
          id: userId,
          username: username || "unknown",
        },
        success: true,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: existing
        ? "Log channel updated. Run a sync to pull logs."
        : "Log channel connected! Run a sync to pull logs from Discord.",
    })
  } catch (error) {
    console.error("Failed to save webhook config:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save configuration" },
      { status: 500 }
    )
  }
}

// PUT /api/webhooks/rx - Update webhook settings (enabled, channelId)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { guildId, enabled, channelId } = body

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

    const existing = await db.collection("webhooks").findOne({ guildId })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "No webhook config found for this guild" },
        { status: 404 }
      )
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: username || "unknown",
    }

    if (enabled !== undefined) {
      updateFields.enabled = enabled
    }

    if (channelId && /^\d{17,20}$/.test(channelId)) {
      // Verify bot can access the new channel
      const botToken = BOT_TOKENS[botId]
      if (botToken) {
        const channelCheck = await fetch(
          `${DISCORD_API_BASE}/channels/${channelId}`,
          { headers: { Authorization: `Bot ${botToken}` } }
        )
        if (!channelCheck.ok) {
          return NextResponse.json(
            { success: false, error: "Cannot access that channel. Make sure SyrupRx has Read Message History permission." },
            { status: 400 }
          )
        }
        const channelData = await channelCheck.json()
        if (channelData.guild_id !== guildId) {
          return NextResponse.json(
            { success: false, error: "That channel does not belong to this server" },
            { status: 400 }
          )
        }
      }
      updateFields.channelId = channelId
      // Reset sync state when channel changes
      updateFields.lastMessageId = null
      updateFields.lastSyncedAt = null
    }

    await db.collection("webhooks").updateOne(
      { guildId },
      { $set: updateFields }
    )

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

// DELETE /api/webhooks/rx - Delete webhook config for a guild
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
      message: "Webhook configuration deleted.",
    })
  } catch (error) {
    console.error("Failed to delete webhook:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete webhook" },
      { status: 500 }
    )
  }
}
