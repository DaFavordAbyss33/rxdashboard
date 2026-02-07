import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, isBotConfigured, type BotId } from "@/lib/mongodb"
import { BOT_TOKENS } from "@/lib/discord"
import { isMasterUser } from "@/lib/admin"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"

// Keys that should be masked after saving (secrets)
const SECRET_KEYS = [
  "apiKey",
  "marizmaApiKey",
  "emrApiKey",
  "analyticsKey",
  "webhookUrl",
  "payrollWebhook",
  "stripeCustomerId",
  "token",
  "secret",
]

function maskSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config }
  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase()
    if (SECRET_KEYS.some((secretKey) => lowerKey.includes(secretKey.toLowerCase()))) {
      const value = masked[key]
      if (typeof value === "string" && value.length > 0) {
        // Show last 4 chars only
        masked[key] = "••••••••" + value.slice(-4)
      }
    }
  }
  return masked
}

// Verify user has permission to manage this guild
// Uses bot token to check roles + ownerUserIds for direct user ID access
async function verifyGuildPermission(botId: string, guildId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")
  
  if (!sessionCookie) {
    return false
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    
    if (!userId) {
      return false
    }
    
    // Master admins can manage all guilds
    if (session.isAdmin === true || isMasterUser(userId)) {
      return true
    }
    
    const botToken = BOT_TOKENS[botId as BotId]
    if (!botToken) {
      return false
    }
    
    // Check ownerUserIds from database (direct user ID match, no Discord API needed)
    if (isBotConfigured(botId as BotId)) {
      const db = await getBotDatabase(botId as BotId)
      if (db) {
        const mapleConfig = await db.collection("mapleguildconfigs").findOne({ guildId })
        const dashboardConfig = await db.collection("configs").findOne({ guildId })
        
        // Check ownerUserIds
        const ownerUserIds: string[] = [
          ...(mapleConfig?.ownerUserIds || []),
          ...(dashboardConfig?.config?.ownerUserIds || []),
        ]
        if (ownerUserIds.includes(userId)) {
          return true
        }
        
        // Check admin role IDs via bot token
        const adminRoleIds: string[] = [
          ...(mapleConfig?.adminRoleIds || []),
          ...(dashboardConfig?.config?.adminRoleIds || []),
        ]
        
        if (adminRoleIds.length > 0) {
          const memberResponse = await fetch(
            `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
          )
          
          if (memberResponse.ok) {
            const member = await memberResponse.json()
            const userRoles: string[] = member.roles || []
            if (adminRoleIds.some(roleId => userRoles.includes(roleId))) {
              return true
            }
          }
        }
      }
    }
    
    // Fallback: check if user is guild owner via bot token
    const guildResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    )
    
    if (guildResponse.ok) {
      const guildData = await guildResponse.json()
      if (guildData.owner_id === userId) {
        return true
      }
    }
    
    // Fallback: check if user is a member with MANAGE_GUILD via bot token
    const memberResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    )
    
    if (memberResponse.ok) {
      // User is in the guild - they passed the admin-guilds check to get here
      return true
    }
    
    return false
  } catch {
    return false
  }
}

// GET /api/bots/[botId]/config?guildId=... - Get config for a bot+guild
export async function GET(
  request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get("guildId")

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "Guild ID is required" },
        { status: 400 }
      )
    }

    // Validate botId
    if (!BOT_TOKENS[botId as BotId]) {
      return NextResponse.json(
        { success: false, error: "Invalid bot ID" },
        { status: 400 }
      )
    }

    // Check if bot database is configured (do this before permission check since permission check needs DB)
    if (!isBotConfigured(botId as BotId)) {
      return NextResponse.json({
        success: true,
        config: null,
        configured: false,
        message: "Bot database not configured",
      })
    }

    // Verify permission (checks ownerUserIds, admin roles, and guild ownership)
    const hasPermission = await verifyGuildPermission(botId, guildId)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to manage this guild" },
        { status: 403 }
      )
    }

    // Get config from MongoDB
    const db = await getBotDatabase(botId as BotId)
    if (!db) {
      return NextResponse.json({
        success: true,
        config: null,
        configured: false,
      })
    }

    const configsCollection = db.collection("configs")
    const configDoc = await configsCollection.findOne({ guildId })

    if (!configDoc) {
      return NextResponse.json({
        success: true,
        config: {},
        configured: true,
        isNew: true,
      })
    }

    // Mask secrets before returning
    const maskedConfig = maskSecrets(configDoc.config || {})

    return NextResponse.json({
      success: true,
      config: maskedConfig,
      configured: true,
      isNew: false,
      updatedAt: configDoc.updatedAt,
      updatedBy: configDoc.updatedBy,
    })
  } catch (error) {
    console.error("Failed to fetch bot config:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch config" },
      { status: 500 }
    )
  }
}

// POST /api/bots/[botId]/config - Save config for a bot+guild
export async function POST(
  request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params
    const body = await request.json()
    const { guildId, config, updatedBy } = body

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "Guild ID is required" },
        { status: 400 }
      )
    }

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { success: false, error: "Config object is required" },
        { status: 400 }
      )
    }

    // Validate botId
    if (!BOT_TOKENS[botId as BotId]) {
      return NextResponse.json(
        { success: false, error: "Invalid bot ID" },
        { status: 400 }
      )
    }

    // Check if bot database is configured
    if (!isBotConfigured(botId as BotId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
      )
    }

    // Verify permission (checks ownerUserIds, admin roles, and guild ownership)
    const hasPermission = await verifyGuildPermission(botId, guildId)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to manage this guild" },
        { status: 403 }
      )
    }

    const db = await getBotDatabase(botId as BotId)
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Failed to connect to database" },
        { status: 500 }
      )
    }

    const configsCollection = db.collection("configs")

    // Get existing config to preserve masked values
    const existingDoc = await configsCollection.findOne({ guildId })
    const existingConfig = existingDoc?.config || {}

    // Merge configs - don't overwrite existing values if new value is masked
    const mergedConfig = { ...config }
    for (const key of Object.keys(mergedConfig)) {
      const value = mergedConfig[key]
      if (typeof value === "string" && value.startsWith("••••••••")) {
        // Keep the existing value if the new one is masked
        if (existingConfig[key]) {
          mergedConfig[key] = existingConfig[key]
        } else {
          delete mergedConfig[key]
        }
      }
    }

    // Save to MongoDB
    await configsCollection.updateOne(
      { guildId },
      {
        $set: {
          botId,
          guildId,
          config: mergedConfig,
          updatedAt: new Date().toISOString(),
          updatedBy: updatedBy || "unknown",
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    )

    // Return masked config
    const maskedConfig = maskSecrets(mergedConfig)

    return NextResponse.json({
      success: true,
      message: "Config saved successfully. Bot will sync automatically.",
      config: maskedConfig,
    })
  } catch (error) {
    console.error("Failed to save bot config:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save config" },
      { status: 500 }
    )
  }
}
