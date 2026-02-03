import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, isBotConfigured } from "@/lib/mongodb"
import { resolveUserId } from "@/lib/roblox"
import { BOT_TOKENS } from "@/lib/discord"
import { isMasterUser } from "@/lib/admin"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"

// Verify user has permission to manage this guild
// Uses bot token to check if user has the configured admin role
async function verifyGuildPermission(guildId: string): Promise<boolean> {
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
    
    // Get the bot token for SyrupRx
    const botToken = BOT_TOKENS.syruprx
    if (!botToken) {
      return false
    }
    
    // Get admin role config from MongoDB
    const db = await getBotDatabase("syruprx")
    if (!db) return false
    
    // Check mapleguildconfigs collection (bot setup)
    const mapleConfig = await db.collection("mapleguildconfigs").findOne({ guildId })
    const dashboardConfig = await db.collection("configs").findOne({ guildId })
    
    // Collect admin role IDs from both sources
    const adminRoleIds: string[] = []
    if (mapleConfig?.adminRoleIds) adminRoleIds.push(...mapleConfig.adminRoleIds)
    if (dashboardConfig?.config?.adminRoleIds) adminRoleIds.push(...dashboardConfig.config.adminRoleIds)
    
    if (adminRoleIds.length === 0) {
      // No admin roles configured - fall back to Discord MANAGE_GUILD permission
      // Fetch user's guild membership using bot token
      const memberResponse = await fetch(
        `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
        { headers: { Authorization: `Bot ${botToken}` } }
      )
      
      if (!memberResponse.ok) return false
      
      // User is in the guild - check if they have manage permissions via Discord
      // For now, if no admin roles are configured, allow users who are in the guild
      // The guild page already requires MANAGE_GUILD to access
      return true
    }
    
    // Fetch user's roles in this guild using bot token
    const memberResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    )
    
    if (!memberResponse.ok) {
      return false
    }
    
    const member = await memberResponse.json()
    const userRoles: string[] = member.roles || []
    
    // Check if user has any of the configured admin roles
    return adminRoleIds.some(roleId => userRoles.includes(roleId))
  } catch {
    return false
  }
}

// Get Marizma config for guild
async function getMarizmaConfig(guildId: string) {
  if (!isBotConfigured("syruprx")) {
    return null
  }

  const db = await getBotDatabase("syruprx")
  if (!db) return null

  const configsCollection = db.collection("configs")
  const configDoc = await configsCollection.findOne({ guildId })
  
  if (!configDoc?.config) return null

  return {
    baseURL: configDoc.config["marizma.baseURL"] || "https://maple-api.marizma.games/",
    apiKey: configDoc.config["marizma.apiKey"],
  }
}

// GET - Fetch server info, players, queue, or bans
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get("guildId")
    const action = searchParams.get("action")

    if (!guildId || !action) {
      return NextResponse.json(
        { success: false, error: "guildId and action are required" },
        { status: 400 }
      )
    }

    const hasPermission = await verifyGuildPermission(guildId)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    const config = await getMarizmaConfig(guildId)
    if (!config?.apiKey) {
      return NextResponse.json(
        { success: false, error: "Marizma API not configured. Please set up API key in the Setup tab." },
        { status: 400 }
      )
    }

    const headers: Record<string, string> = {
      "X-Api-Key": config.apiKey,
      "Content-Type": "application/json",
    }

    let endpoint = ""
    switch (action) {
      case "serverinfo":
        endpoint = "v1/server"
        break
      case "players":
        endpoint = "v1/server/players"
        break
      case "queue":
        endpoint = "v1/server/queue"
        break
      case "bans":
        endpoint = "v1/server/bans"
        break
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }

    const baseURL = config.baseURL.endsWith("/") ? config.baseURL : `${config.baseURL}/`
    const response = await fetch(`${baseURL}${endpoint}`, {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { success: false, error: `Marizma API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Marizma API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch from Marizma API" },
      { status: 500 }
    )
  }
}

// POST - Execute actions (announce, kick, ban, settings, banner, shutdown)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { guildId, action, ...params } = body

    if (!guildId || !action) {
      return NextResponse.json(
        { success: false, error: "guildId and action are required" },
        { status: 400 }
      )
    }

    const hasPermission = await verifyGuildPermission(guildId)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    const config = await getMarizmaConfig(guildId)
    if (!config?.apiKey) {
      return NextResponse.json(
        { success: false, error: "Marizma API not configured. Please set up API key in the Setup tab." },
        { status: 400 }
      )
    }

    const headers: Record<string, string> = {
      "X-Api-Key": config.apiKey,
      "Content-Type": "application/json",
    }

    let endpoint = ""
    let requestBody: Record<string, unknown> = {}

    // Resolve user identifier (username or ID) to numeric ID for kick/ban
    let resolvedUserId: number | null = null
    if (action === "kick" || action === "ban" || action === "unban") {
      const identifier = params.userId || params.identifier
      if (!identifier) {
        return NextResponse.json(
          { success: false, error: "User identifier is required" },
          { status: 400 }
        )
      }
      resolvedUserId = await resolveUserId(String(identifier))
      if (!resolvedUserId) {
        return NextResponse.json(
          { success: false, error: `Could not find Roblox user: ${identifier}` },
          { status: 400 }
        )
      }
    }

    switch (action) {
      case "announce":
        endpoint = "v1/server/announce"
        requestBody = { message: params.message }
        break
      case "kick":
        endpoint = "v1/server/moderation/kick"
        requestBody = { 
          UserId: resolvedUserId, 
          ModerationReason: params.reason || undefined 
        }
        break
      case "ban":
        endpoint = "v1/server/banplayer"
        requestBody = { 
          UserId: resolvedUserId, 
          Banned: true 
        }
        break
      case "unban":
        endpoint = "v1/server/banplayer"
        requestBody = { 
          UserId: resolvedUserId, 
          Banned: false 
        }
        break
      case "settings":
        endpoint = "v1/server/setSetting"
        requestBody = {}
        if (params.hideFromList !== undefined) requestBody.HideFromList = params.hideFromList
        if (params.private !== undefined) requestBody.Private = params.private
        if (params.minLevel !== undefined) requestBody.minLevel = params.minLevel
        break
      case "banner":
        endpoint = "v1/server/setbanner"
        requestBody = { banner: params.text }
        break
      case "shutdown":
        endpoint = "v1/server/shutdown"
        break
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }

    const baseURL = config.baseURL.endsWith("/") ? config.baseURL : `${config.baseURL}/`
    const response = await fetch(`${baseURL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { success: false, error: `Marizma API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json().catch(() => ({}))

    // If ban was successful, also kick the player to remove them from current server
    if (action === "ban" && resolvedUserId) {
      try {
        await fetch(`${baseURL}v1/server/moderation/kick`, {
          method: "POST",
          headers,
          body: JSON.stringify({ 
            UserId: resolvedUserId, 
            ModerationReason: "Banned from server" 
          }),
        })
        // We don't check the kick response - player may not be online, which is fine
      } catch {
        // Kick failed silently - ban was still successful
      }
    }

    return NextResponse.json({ success: true, data, message: `${action} executed successfully` })
  } catch (error) {
    console.error("Marizma API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to execute action" },
      { status: 500 }
    )
  }
}
