import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { isBotConfigured, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"
import { readAuditLogs } from "@/lib/audit-log"
import { BOT_TOKENS } from "@/lib/discord"
import { getBotDatabase } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"

// Verify user has permission to view audit logs for this guild
async function verifyPermission(botId: string, guildId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")

  if (!sessionCookie) return false

  try {
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    if (!userId) return false

    if (session.isAdmin === true || isMasterUser(userId)) return true

    const botToken = BOT_TOKENS[botId as BotId]
    if (!botToken) return false

    // Check ownerUserIds and adminRoleIds
    if (isBotConfigured(botId as BotId)) {
      const db = await getBotDatabase(botId as BotId)
      if (db) {
        const mapleConfig = await db.collection("mapleguildconfigs").findOne({ guildId })
        const dashboardConfig = await db.collection("configs").findOne({ guildId })

        const ownerUserIds: string[] = [
          ...(mapleConfig?.ownerUserIds || []),
          ...(dashboardConfig?.config?.ownerUserIds || []),
        ]
        if (ownerUserIds.includes(userId)) return true

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
            if (adminRoleIds.some((roleId) => userRoles.includes(roleId))) return true
          }
        }
      }
    }

    // Fallback: check guild ownership
    const guildResponse = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${BOT_TOKENS[botId as BotId]}` },
    })
    if (guildResponse.ok) {
      const guildData = await guildResponse.json()
      if (guildData.owner_id === userId) return true
    }

    return false
  } catch {
    return false
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get("guildId")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
    const category = searchParams.get("category") || undefined
    const action = searchParams.get("action") || undefined
    const search = searchParams.get("search") || undefined

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: "guildId is required" },
        { status: 400 }
      )
    }

    if (!isBotConfigured(botId as BotId)) {
      return NextResponse.json(
        { success: false, error: "Bot not configured" },
        { status: 400 }
      )
    }

    const hasPermission = await verifyPermission(botId, guildId)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    const result = await readAuditLogs(botId as BotId, guildId, {
      page,
      limit,
      category,
      action,
      search,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("Audit log fetch error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
