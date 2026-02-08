import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { isBotConfigured, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"
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

/**
 * Classify a webhook log entry into a source tag.
 * Webhook logs from Discord/Roblox get tagged as "Webhook" by default,
 * but moderation-type actions (kick, ban, etc.) also get a "Moderation" tag,
 * and server-related actions get a "Server" tag.
 */
function classifyWebhookLog(log: Record<string, unknown>): string[] {
  const tags = ["Webhook"]
  const type = String(log.type || "").toLowerCase()
  const action = String(log.action || log.command || "").toLowerCase()

  if (
    type === "moderation" ||
    action.includes("kick") ||
    action.includes("ban") ||
    action.includes("mute") ||
    action.includes("warn")
  ) {
    tags.push("Moderation")
  }

  if (
    type === "admin" ||
    type === "system" ||
    action.includes("shutdown") ||
    action.includes("server") ||
    action.includes("lock")
  ) {
    tags.push("Server")
  }

  return tags
}

/**
 * Classify a dashboard audit log entry into source tags.
 */
function classifyAuditLog(log: Record<string, unknown>): string[] {
  const tags = ["Dashboard"]
  const category = String(log.category || "").toLowerCase()
  const action = String(log.action || "").toLowerCase()

  if (
    category === "moderation" ||
    action === "kick" ||
    action === "ban" ||
    action === "unban" ||
    action === "mute"
  ) {
    tags.push("Moderation")
  }

  if (
    category === "server" ||
    action === "shutdown" ||
    action === "settings" ||
    action === "banner"
  ) {
    tags.push("Server")
  }

  return tags
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
    const source = searchParams.get("source") || undefined // "Dashboard", "Webhook", "Server", "Moderation", or undefined for all

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

    const db = await getBotDatabase(botId as BotId)
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 500 }
      )
    }

    // ---- Fetch from both collections and merge ----

    // 1. Build audit_logs query
    const auditQuery: Record<string, unknown> = { guildId }
    if (category && category !== "all") auditQuery.category = category
    if (action) auditQuery.action = action
    if (search) {
      auditQuery.$or = [
        { action: { $regex: search, $options: "i" } },
        { "executedBy.username": { $regex: search, $options: "i" } },
        { "targetUser.name": { $regex: search, $options: "i" } },
        { "details.message": { $regex: search, $options: "i" } },
      ]
    }

    // 2. Build webhook_logs query
    const webhookQuery: Record<string, unknown> = { guildId }
    if (search) {
      webhookQuery.$or = [
        { action: { $regex: search, $options: "i" } },
        { player: { $regex: search, $options: "i" } },
        { target: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { command: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { server: { $regex: search, $options: "i" } },
      ]
    }

    // Determine which collections to query based on source filter
    const shouldFetchAudit = !source || source === "Dashboard" || source === "Server" || source === "Moderation"
    const shouldFetchWebhook = !source || source === "Webhook" || source === "Server" || source === "Moderation"

    // Fetch both in parallel (grab more than needed, then merge & paginate)
    const fetchLimit = 500 // Fetch a generous amount for merging

    const [auditLogs, webhookLogs] = await Promise.all([
      shouldFetchAudit
        ? db.collection("audit_logs")
            .find(auditQuery)
            .sort({ timestamp: -1 })
            .limit(fetchLimit)
            .toArray()
        : Promise.resolve([]),
      shouldFetchWebhook
        ? db.collection("webhook_logs")
            .find(webhookQuery)
            .sort({ timestamp: -1 })
            .limit(fetchLimit)
            .toArray()
        : Promise.resolve([]),
    ])

    // Normalize audit logs
    const normalizedAudit = auditLogs.map((doc) => {
      const tags = classifyAuditLog(doc)
      return {
        _id: doc._id.toString(),
        source: "dashboard" as const,
        tags,
        action: doc.action || "unknown",
        category: doc.category || "system",
        details: doc.details || {},
        executedBy: doc.executedBy || { id: "0", username: "System" },
        targetUser: doc.targetUser || undefined,
        success: doc.success !== false,
        error: doc.error || undefined,
        timestamp: doc.timestamp,
        // Webhook-specific fields (null for dashboard logs)
        webhookData: null,
      }
    })

    // Normalize webhook logs
    const normalizedWebhook = webhookLogs.map((doc) => {
      const tags = classifyWebhookLog(doc)
      return {
        _id: doc._id.toString(),
        source: "webhook" as const,
        tags,
        action: doc.action || doc.command || "unknown",
        category: doc.type || "command",
        details: {},
        executedBy: doc.player
          ? { id: doc.playerId || "0", username: doc.player }
          : { id: "0", username: "System" },
        targetUser: doc.target
          ? { id: doc.targetId || "0", name: doc.target }
          : undefined,
        success: true,
        error: undefined,
        timestamp: doc.timestamp,
        // Webhook-specific extra data
        webhookData: {
          title: doc.title || doc.action || "Log",
          command: doc.command || null,
          player: doc.player || null,
          playerId: doc.playerId || null,
          playerProfileUrl: doc.playerProfileUrl || (doc.playerId ? `https://www.roblox.com/users/${doc.playerId}/profile` : null),
          target: doc.target || null,
          targetId: doc.targetId || null,
          targetProfileUrl: doc.targetProfileUrl || (doc.targetId ? `https://www.roblox.com/users/${doc.targetId}/profile` : null),
          message: doc.message || null,
          server: doc.server || null,
          embedColor: doc.embedColor || null,
          type: doc.type || "command",
        },
      }
    })

    // Merge and sort by timestamp
    let merged = [...normalizedAudit, ...normalizedWebhook]

    // Apply source tag filter
    if (source) {
      merged = merged.filter((entry) => entry.tags.includes(source))
    }

    // Sort by timestamp descending
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Paginate
    const total = merged.length
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit
    const paged = merged.slice(skip, skip + limit)

    return NextResponse.json({
      success: true,
      logs: paged,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error("Audit log fetch error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
