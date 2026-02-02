import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, isBotConfigured } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// Verify user has permission to manage this guild
async function verifyGuildPermission(guildId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")
  
  if (!sessionCookie) {
    return false
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const userGuilds = session.guilds || []
    
    const guild = userGuilds.find((g: { id: string }) => g.id === guildId)
    if (!guild) {
      return false
    }

    const permissions = BigInt(guild.permissions || 0)
    const MANAGE_GUILD = BigInt(0x20)
    const ADMINISTRATOR = BigInt(0x8)
    
    return (permissions & MANAGE_GUILD) === MANAGE_GUILD || 
           (permissions & ADMINISTRATOR) === ADMINISTRATOR ||
           session.isAdmin === true
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

    switch (action) {
      case "announce":
        endpoint = "v1/server/announce"
        requestBody = { message: params.message }
        break
      case "kick":
        endpoint = "v1/server/moderation/kick"
        requestBody = { 
          UserId: parseInt(params.userId as string), 
          ModerationReason: params.reason || undefined 
        }
        break
      case "ban":
        endpoint = "v1/server/banplayer"
        requestBody = { 
          UserId: parseInt(params.userId as string), 
          Banned: params.banned 
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
    return NextResponse.json({ success: true, data, message: `${action} executed successfully` })
  } catch (error) {
    console.error("Marizma API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to execute action" },
      { status: 500 }
    )
  }
}
