import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { isBotConfigured, type BotId, getBotDatabase } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"
import { BOT_TOKENS } from "@/lib/discord"

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

    // ---- Auto-sync webhook logs from Discord (lightweight, debounced) ----
    // Only sync if a webhook channel is configured, and at most once every 5 seconds per guild
    try {
      const webhookConfig = await db.collection("webhooks").findOne({ guildId })
      if (webhookConfig && webhookConfig.enabled !== false && webhookConfig.channelId) {
        const lastSync = webhookConfig.lastSyncedAt ? new Date(webhookConfig.lastSyncedAt).getTime() : 0
        const now = Date.now()
        // Only auto-sync every 5 seconds to avoid hammering Discord API
        if (now - lastSync > 5000) {
          const botToken = BOT_TOKENS[botId as BotId]
          if (botToken) {
            const channelId = webhookConfig.channelId
            const lastMessageId = webhookConfig.lastMessageId

            let fetchUrl = `https://discord.com/api/v10/channels/${channelId}/messages?limit=25`
            if (lastMessageId) {
              fetchUrl += `&after=${lastMessageId}`
            }

            const messagesRes = await fetch(fetchUrl, {
              headers: { Authorization: `Bot ${botToken}` },
            }).catch(() => null)

            if (messagesRes && messagesRes.ok) {
              const messages = await messagesRes.json()
              if (Array.isArray(messages) && messages.length > 0) {
                // Sort oldest first
                messages.sort((a: { timestamp: string }, b: { timestamp: string }) =>
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                )

                const webhookMessages = messages.filter(
                  (msg: { webhook_id?: string; embeds?: unknown[] }) =>
                    msg.webhook_id && msg.embeds && msg.embeds.length > 0
                )

                const logEntries: Record<string, unknown>[] = []
                for (const msg of webhookMessages) {
                  // Quick dupe check
                  const exists = await db.collection("webhook_logs").findOne({
                    discordMessageId: msg.id,
                    guildId,
                  })
                  if (exists) continue

                  for (const embed of msg.embeds) {
                    const title = embed.title || "Unknown"
                    const description = embed.description || ""
                    const footer = embed.footer?.text || ""
                    const titleLower = title.toLowerCase()

                    let type = "command"
                    if (titleLower.includes("ban") || titleLower.includes("kick") || titleLower.includes("mute") || titleLower.includes("warn")) type = "moderation"
                    else if (titleLower.includes("admin")) type = "admin"
                    else if (titleLower.includes("system") || titleLower.includes("server")) type = "system"

                    let player: string | null = null
                    let playerId: string | null = null
                    let playerProfileUrl: string | null = null
                    let command: string | null = null
                    let message: string | null = description || null
                    let server: string | null = null
                    let target: string | null = null
                    let targetId: string | null = null
                    let targetProfileUrl: string | null = null

                    const linkedCmdMatch = description.match(
                      /^\[([^\]]+?):(\d+)\]\((https?:\/\/[^\)]+)\)\s+ran the command:\s*(.+)/s
                    )
                    const plainCmdMatch = description.match(
                      /^([^\[\]]+?):(\d+)\s+ran the command:\s*(.+)/s
                    )

                    if (linkedCmdMatch) {
                      player = linkedCmdMatch[1].trim()
                      playerId = linkedCmdMatch[2].trim()
                      playerProfileUrl = linkedCmdMatch[3].trim()
                      const fullCmd = linkedCmdMatch[4].trim()
                      const cmdParts = fullCmd.match(/^(:\S+)\s*(.*)/s)
                      command = cmdParts ? cmdParts[1] : fullCmd
                      message = cmdParts ? (cmdParts[2] || null) : null
                    } else if (plainCmdMatch) {
                      player = plainCmdMatch[1].trim()
                      playerId = plainCmdMatch[2].trim()
                      playerProfileUrl = `https://www.roblox.com/users/${playerId}/profile`
                      const fullCmd = plainCmdMatch[3].trim()
                      const cmdParts = fullCmd.match(/^(:\S+)\s*(.*)/s)
                      command = cmdParts ? cmdParts[1] : fullCmd
                      message = cmdParts ? (cmdParts[2] || null) : null
                    } else {
                      const linkedGeneric = description.match(/^\[([^\]]+?):(\d+)\]\((https?:\/\/[^\)]+)\)\s+(.+)/s)
                      const plainGeneric = description.match(/^([^\[\]]+?):(\d+)\s+(.+)/s)
                      if (linkedGeneric) {
                        player = linkedGeneric[1].trim()
                        playerId = linkedGeneric[2].trim()
                        playerProfileUrl = linkedGeneric[3].trim()
                        message = linkedGeneric[4].trim()
                      } else if (plainGeneric) {
                        player = plainGeneric[1].trim()
                        playerId = plainGeneric[2].trim()
                        playerProfileUrl = `https://www.roblox.com/users/${playerId}/profile`
                        message = plainGeneric[3].trim()
                      }
                    }

                    if (footer) {
                      const serverMatch = footer.match(/(?:Custom )?Server:\s*(.+)/i)
                      server = serverMatch ? serverMatch[1].trim() : footer
                    }

                    // Parse target from embed fields
                    if (embed.fields) {
                      for (const field of embed.fields) {
                        const name = (field.name || "").toLowerCase()
                        if (name.includes("target")) {
                          const tl = field.value.match(/^\[([^\]]+?):(\d+)\]\((https?:\/\/[^\)]+)\)/)
                          const tp = field.value.match(/^(.+?):(\d+)/)
                          if (tl) { target = tl[1].trim(); targetId = tl[2].trim(); targetProfileUrl = tl[3].trim() }
                          else if (tp) { target = tp[1].trim(); targetId = tp[2].trim(); targetProfileUrl = `https://www.roblox.com/users/${targetId}/profile` }
                          else target = field.value
                        }
                      }
                    }

                    logEntries.push({
                      guildId,
                      channelId,
                      discordMessageId: msg.id,
                      discordTimestamp: msg.timestamp,
                      type,
                      title,
                      action: command || title,
                      player,
                      playerId,
                      playerProfileUrl,
                      target,
                      targetId,
                      targetProfileUrl,
                      command,
                      message,
                      server,
                      embedColor: embed.color || null,
                      timestamp: msg.timestamp,
                    })
                  }
                }

                if (logEntries.length > 0) {
                  await db.collection("webhook_logs").insertMany(logEntries)
                }

                const newestMessageId = messages[messages.length - 1].id
                await db.collection("webhooks").updateOne(
                  { guildId },
                  {
                    $set: {
                      lastMessageId: newestMessageId,
                      lastSyncedAt: new Date().toISOString(),
                    },
                    $inc: { totalLogs: logEntries.length },
                  }
                )
              } else {
                // No new messages, just update sync time
                await db.collection("webhooks").updateOne(
                  { guildId },
                  { $set: { lastSyncedAt: new Date().toISOString() } }
                )
              }
            }
          }
        }
      }
    } catch (syncErr) {
      // Auto-sync is best-effort; don't fail the audit log request
      console.error("Auto-sync error (non-fatal):", syncErr)
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
