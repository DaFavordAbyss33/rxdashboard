import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, isBotConfigured, type BotId } from "@/lib/mongodb"
import { BOT_TOKENS } from "@/lib/discord"

export const dynamic = "force-dynamic"

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
// Fetches current guild membership from Discord to get fresh permissions
async function verifyGuildPermission(guildId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")
  
  if (!sessionCookie) {
    return false
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    
    // Master admins can manage all guilds
    if (session.isAdmin === true) {
      return true
    }
    
    const accessToken = session.accessToken
    if (!accessToken) {
      return false
    }
    
    // Check if user is in this guild (from stored guildIds or guilds array)
    const userGuildIds = session.guildIds || (session.guilds?.map((g: { id: string }) => g.id) || [])
    if (!userGuildIds.includes(guildId)) {
      return false
    }
    
    // Fetch current member data to get fresh permissions
    const memberResponse = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    if (!memberResponse.ok) {
      return false
    }
    
    // For guild member endpoint, we need to fetch guild info separately for permissions
    // Actually, the guilds endpoint gives us permissions, so let's use that
    const guildsResponse = await fetch(
      `https://discord.com/api/users/@me/guilds`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    if (!guildsResponse.ok) {
      return false
    }
    
    const guilds = await guildsResponse.json()
    const guild = guilds.find((g: { id: string }) => g.id === guildId)
    
    if (!guild) {
      return false
    }

    // Check for MANAGE_GUILD (0x20) or ADMINISTRATOR (0x8) permission
    const permissions = BigInt(guild.permissions || 0)
    const MANAGE_GUILD = BigInt(0x20)
    const ADMINISTRATOR = BigInt(0x8)
    
    return (permissions & MANAGE_GUILD) === MANAGE_GUILD || 
           (permissions & ADMINISTRATOR) === ADMINISTRATOR
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

    // Verify permission
    const hasPermission = await verifyGuildPermission(guildId)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to manage this guild" },
        { status: 403 }
      )
    }

    // Check if bot database is configured
    if (!isBotConfigured(botId as BotId)) {
      return NextResponse.json({
        success: true,
        config: null,
        configured: false,
        message: "Bot database not configured",
      })
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

    // Verify permission
    const hasPermission = await verifyGuildPermission(guildId)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to manage this guild" },
        { status: 403 }
      )
    }

    // Check if bot database is configured
    if (!isBotConfigured(botId as BotId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
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
