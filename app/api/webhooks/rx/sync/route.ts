import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, isBotConfigured, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"
import { BOT_TOKENS } from "@/lib/discord"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"
const MAX_WEBHOOK_LOGS = 10000

// ---- Discord embed parsing ----

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  footer?: { text?: string }
  fields?: { name: string; value: string; inline?: boolean }[]
  timestamp?: string
  author?: { name?: string }
}

interface DiscordMessage {
  id: string
  channel_id: string
  content: string
  timestamp: string
  author: {
    id: string
    username: string
    bot?: boolean
    discriminator?: string
  }
  embeds: DiscordEmbed[]
  webhook_id?: string
}

interface ParsedLog {
  type: string
  title: string
  player: string | null
  playerId: string | null
  playerProfileUrl: string | null
  command: string | null
  message: string | null
  server: string | null
  target: string | null
  targetId: string | null
  targetProfileUrl: string | null
}

/**
 * Parse a Discord embed into structured log fields.
 * The Maple game sends embeds like:
 *   title: "Command Executed"
 *   description: "[MistyReligions:82197574](https://www.roblox.com/users/82197574/profile) ran the command: :a |REMINDER| ..."
 *   footer.text: "Custom Server: a8d-961"
 */
function parseDiscordEmbed(embed: DiscordEmbed): ParsedLog {
  const title = embed.title || "Unknown"
  const description = embed.description || ""
  const footer = embed.footer?.text || ""

  // Determine type from title
  const titleLower = title.toLowerCase()
  let type = "command"
  if (titleLower.includes("ban") || titleLower.includes("kick") || titleLower.includes("mute") || titleLower.includes("warn")) {
    type = "moderation"
  } else if (titleLower.includes("admin")) {
    type = "admin"
  } else if (titleLower.includes("join")) {
    type = "join"
  } else if (titleLower.includes("leave") || titleLower.includes("left")) {
    type = "leave"
  } else if (titleLower.includes("system") || titleLower.includes("server")) {
    type = "system"
  }

  let player: string | null = null
  let playerId: string | null = null
  let playerProfileUrl: string | null = null
  let command: string | null = null
  let message: string | null = description || null

  // Pattern 1: [Username:UserId](profile_url) ran the command: ...
  const linkedCmdMatch = description.match(
    /^\[([^\]]+?):(\d+)\]\((https?:\/\/[^\)]+)\)\s+ran the command:\s*(.+)/s
  )
  // Pattern 2: Username:UserId ran the command: ...
  const plainCmdMatch = description.match(
    /^([^\[\]]+?):(\d+)\s+ran the command:\s*(.+)/s
  )
  // Pattern 3: Hyperlinked player generic action
  const linkedGenericMatch = description.match(
    /^\[([^\]]+?):(\d+)\]\((https?:\/\/[^\)]+)\)\s+(.+)/s
  )
  // Pattern 4: Plain text generic
  const plainGenericMatch = description.match(
    /^([^\[\]]+?):(\d+)\s+(.+)/s
  )

  if (linkedCmdMatch) {
    player = linkedCmdMatch[1].trim()
    playerId = linkedCmdMatch[2].trim()
    playerProfileUrl = linkedCmdMatch[3].trim()
    const fullCommand = linkedCmdMatch[4].trim()
    const cmdParts = fullCommand.match(/^(:\S+)\s*(.*)/s)
    if (cmdParts) {
      command = cmdParts[1]
      message = cmdParts[2] || null
    } else {
      command = fullCommand
      message = null
    }
  } else if (plainCmdMatch) {
    player = plainCmdMatch[1].trim()
    playerId = plainCmdMatch[2].trim()
    playerProfileUrl = `https://www.roblox.com/users/${playerId}/profile`
    const fullCommand = plainCmdMatch[3].trim()
    const cmdParts = fullCommand.match(/^(:\S+)\s*(.*)/s)
    if (cmdParts) {
      command = cmdParts[1]
      message = cmdParts[2] || null
    } else {
      command = fullCommand
      message = null
    }
  } else if (linkedGenericMatch) {
    player = linkedGenericMatch[1].trim()
    playerId = linkedGenericMatch[2].trim()
    playerProfileUrl = linkedGenericMatch[3].trim()
    message = linkedGenericMatch[4].trim()
  } else if (plainGenericMatch) {
    player = plainGenericMatch[1].trim()
    playerId = plainGenericMatch[2].trim()
    playerProfileUrl = `https://www.roblox.com/users/${playerId}/profile`
    message = plainGenericMatch[3].trim()
  }

  // Parse footer for server info
  let server: string | null = null
  if (footer) {
    const serverMatch = footer.match(/(?:Custom )?Server:\s*(.+)/i)
    if (serverMatch) {
      server = serverMatch[1].trim()
    } else {
      server = footer
    }
  }

  // Check embed fields for structured data
  let target: string | null = null
  let targetId: string | null = null
  let targetProfileUrl: string | null = null
  if (embed.fields) {
    for (const field of embed.fields) {
      const name = field.name.toLowerCase()
      if (name.includes("target")) {
        const targetLinked = field.value.match(/^\[([^\]]+?):(\d+)\]\((https?:\/\/[^\)]+)\)/)
        const targetPlain = field.value.match(/^(.+?):(\d+)/)
        if (targetLinked) {
          target = targetLinked[1].trim()
          targetId = targetLinked[2].trim()
          targetProfileUrl = targetLinked[3].trim()
        } else if (targetPlain) {
          target = targetPlain[1].trim()
          targetId = targetPlain[2].trim()
          targetProfileUrl = `https://www.roblox.com/users/${targetId}/profile`
        } else {
          target = field.value
        }
      }
      if (!player && name.includes("player")) {
        player = field.value
      }
      if (name.includes("reason") || name.includes("detail")) {
        message = field.value
      }
      if (name.includes("command") && !command) {
        command = field.value
      }
    }
  }

  return { type, title, player, playerId, playerProfileUrl, command, message, server, target, targetId, targetProfileUrl }
}

// Verify user has permission
async function verifySyncPermission(guildId: string): Promise<{ allowed: boolean; userId?: string; username?: string }> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")

  if (!sessionCookie) return { allowed: false }

  try {
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    const username = session.user?.username
    if (!userId) return { allowed: false }

    if (session.isAdmin === true || isMasterUser(userId)) {
      return { allowed: true, userId, username }
    }

    const botId = "syruprx" as BotId
    const botToken = BOT_TOKENS[botId]
    if (!botToken) return { allowed: false }

    if (isBotConfigured(botId)) {
      const db = await getBotDatabase(botId)
      if (db) {
        const dashboardConfig = await db.collection("configs").findOne({ guildId })
        const ownerUserIds: string[] = dashboardConfig?.config?.ownerUserIds || []
        if (ownerUserIds.includes(userId)) {
          return { allowed: true, userId, username }
        }
        // Also allow admin role users to sync
        const adminRoleIds: string[] = dashboardConfig?.config?.adminRoleIds || []
        if (adminRoleIds.length > 0) {
          const memberResponse = await fetch(
            `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
            { headers: { Authorization: `Bot ${botToken}` } }
          )
          if (memberResponse.ok) {
            const member = await memberResponse.json()
            const userRoles: string[] = member.roles || []
            if (adminRoleIds.some((roleId: string) => userRoles.includes(roleId))) {
              return { allowed: true, userId, username }
            }
          }
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

// POST /api/webhooks/rx/sync - Sync logs from Discord channel
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { guildId } = body

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

    const { allowed } = await verifySyncPermission(guildId)
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

    const webhookConfig = await db.collection("webhooks").findOne({ guildId })
    if (!webhookConfig) {
      return NextResponse.json(
        { success: false, error: "No webhook configuration found. Set up a log channel first." },
        { status: 404 }
      )
    }

    if (webhookConfig.enabled === false) {
      return NextResponse.json(
        { success: false, error: "Webhook syncing is disabled" },
        { status: 400 }
      )
    }

    const botToken = BOT_TOKENS[botId]
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: "Bot token not configured" },
        { status: 500 }
      )
    }

    const channelId = webhookConfig.channelId
    const lastMessageId = webhookConfig.lastMessageId

    // Fetch messages from the channel using bot token
    // Get up to 100 messages per sync (Discord API limit)
    let url = `${DISCORD_API_BASE}/channels/${channelId}/messages?limit=100`
    if (lastMessageId) {
      url += `&after=${lastMessageId}`
    }

    const messagesResponse = await fetch(url, {
      headers: { Authorization: `Bot ${botToken}` },
    })

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text()
      console.error("Discord API error fetching messages:", messagesResponse.status, errorText)

      if (messagesResponse.status === 403) {
        return NextResponse.json(
          { success: false, error: "Bot does not have permission to read messages in that channel. Grant Read Message History permission." },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: "Failed to fetch messages from Discord" },
        { status: 502 }
      )
    }

    const messages: DiscordMessage[] = await messagesResponse.json()

    if (messages.length === 0) {
      // Update last synced time even if no new messages
      await db.collection("webhooks").updateOne(
        { guildId },
        { $set: { lastSyncedAt: new Date().toISOString() } }
      )

      return NextResponse.json({
        success: true,
        message: "No new messages to sync",
        synced: 0,
      })
    }

    // Sort messages oldest first (Discord returns newest first)
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Filter to only webhook messages with embeds (from the Maple game)
    const webhookMessages = messages.filter(
      (msg) => msg.webhook_id && msg.embeds && msg.embeds.length > 0
    )

    // Parse each webhook message's embeds into log entries
    const logEntries = []
    for (const msg of webhookMessages) {
      for (const embed of msg.embeds) {
        const parsed = parseDiscordEmbed(embed)

        // Check for duplicate (same discord message ID + embed position)
        const existingLog = await db.collection("webhook_logs").findOne({
          discordMessageId: msg.id,
          guildId,
        })
        if (existingLog) continue

        logEntries.push({
          guildId,
          channelId,
          discordMessageId: msg.id,
          discordTimestamp: msg.timestamp,
          type: parsed.type,
          title: parsed.title,
          action: parsed.command || parsed.title,
          player: parsed.player,
          playerId: parsed.playerId,
          playerProfileUrl: parsed.playerProfileUrl,
          target: parsed.target,
          targetId: parsed.targetId,
          targetProfileUrl: parsed.targetProfileUrl,
          command: parsed.command,
          message: parsed.message,
          server: parsed.server,
          embedColor: embed.color || null,
          rawEmbed: embed,
          timestamp: msg.timestamp,
        })
      }
    }

    // Store new log entries
    if (logEntries.length > 0) {
      await db.collection("webhook_logs").insertMany(logEntries)
    }

    // Track the newest message ID for pagination on next sync
    const newestMessageId = messages[messages.length - 1].id

    // Update webhook config
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

    // Ensure indexes
    await db.collection("webhook_logs").createIndex({ guildId: 1, timestamp: -1 }).catch(() => {})
    await db.collection("webhook_logs").createIndex({ discordMessageId: 1, guildId: 1 }).catch(() => {})
    await db.collection("webhook_logs").createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 30 * 24 * 60 * 60 }
    ).catch(() => {})

    // Trim old logs if over limit
    const logCount = await db.collection("webhook_logs").countDocuments({ guildId })
    if (logCount > MAX_WEBHOOK_LOGS) {
      const excess = logCount - MAX_WEBHOOK_LOGS
      const oldest = await db.collection("webhook_logs")
        .find({ guildId })
        .sort({ timestamp: 1 })
        .limit(excess)
        .project({ _id: 1 })
        .toArray()

      if (oldest.length > 0) {
        await db.collection("webhook_logs").deleteMany({
          _id: { $in: oldest.map(d => d._id) },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${logEntries.length} new log${logEntries.length !== 1 ? "s" : ""} from ${webhookMessages.length} message${webhookMessages.length !== 1 ? "s" : ""}`,
      synced: logEntries.length,
      messagesProcessed: webhookMessages.length,
      totalMessages: messages.length,
    })
  } catch (error) {
    console.error("Failed to sync webhook logs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to sync logs" },
      { status: 500 }
    )
  }
}
