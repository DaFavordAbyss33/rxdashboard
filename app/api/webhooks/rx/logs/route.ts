import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, isBotConfigured, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"
import { BOT_TOKENS } from "@/lib/discord"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"

// Verify user has permission to view logs for this guild
async function verifyLogsPermission(guildId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")
  
  if (!sessionCookie) return false

  try {
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    if (!userId) return false
    
    if (session.isAdmin === true || isMasterUser(userId)) return true
    
    const botId = "syruprx" as BotId
    const botToken = BOT_TOKENS[botId]
    if (!botToken) return false
    
    // Check ownerUserIds and adminRoleIds
    if (isBotConfigured(botId)) {
      const db = await getBotDatabase(botId)
      if (db) {
        const dashboardConfig = await db.collection("configs").findOne({ guildId })
        const ownerUserIds: string[] = dashboardConfig?.config?.ownerUserIds || []
        if (ownerUserIds.includes(userId)) return true
        
        const adminRoleIds: string[] = dashboardConfig?.config?.adminRoleIds || []
        if (adminRoleIds.length > 0) {
          const memberResponse = await fetch(
            `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
          )
          if (memberResponse.ok) {
            const member = await memberResponse.json()
            const userRoles: string[] = member.roles || []
            if (adminRoleIds.some(roleId => userRoles.includes(roleId))) return true
          }
        }
      }
    }
    
    // Check guild owner
    const guildResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    )
    if (guildResponse.ok) {
      const guildData = await guildResponse.json()
      if (guildData.owner_id === userId) return true
    }
    
    return false
  } catch {
    return false
  }
}

// GET /api/webhooks/rx/logs?guildId=...&page=...&limit=...&type=...&search=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get("guildId")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "Guild ID is required" },
        { status: 400 }
      )
    }

    const botId = "syruprx" as BotId
    if (!isBotConfigured(botId)) {
      return NextResponse.json({ success: false, error: "Bot database not configured" })
    }

    const allowed = await verifyLogsPermission(guildId)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
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

    // Build query
    const query: Record<string, unknown> = { guildId }
    if (type) query.type = type
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: "i" } },
        { player: { $regex: search, $options: "i" } },
        { target: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { command: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { server: { $regex: search, $options: "i" } },
      ]
    }

    const total = await db.collection("webhook_logs").countDocuments(query)
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    const logs = await db.collection("webhook_logs")
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        id: log._id.toString(),
        type: log.type || "command",
        title: log.title || log.action || "Log",
        action: log.action || log.command || "unknown",
        command: log.command || null,
        player: log.player || null,
        playerId: log.playerId || null,
        playerProfileUrl: log.playerProfileUrl || (log.playerId ? `https://www.roblox.com/users/${log.playerId}/profile` : null),
        target: log.target || null,
        targetId: log.targetId || null,
        targetProfileUrl: log.targetProfileUrl || (log.targetId ? `https://www.roblox.com/users/${log.targetId}/profile` : null),
        message: log.message || null,
        server: log.server || null,
        embedColor: log.embedColor || null,
        timestamp: log.timestamp,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("Failed to fetch webhook logs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}
