import { NextResponse } from "next/server"
import { getBotDatabase, isBotConfigured, type BotId } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

const MAX_WEBHOOK_LOGS = 10000

// CORS headers for external requests (Maple game server, Roblox, etc.)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// ---- Discord embed parsing helpers ----

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  footer?: { text?: string }
  fields?: { name: string; value: string; inline?: boolean }[]
  timestamp?: string
  author?: { name?: string }
  thumbnail?: { url?: string }
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
 *   description: "[MistyReligions:82197574](https://www.roblox.com/users/82197574/profile) ran the command: :a |REMINDER| Please do not crowd..."
 *   footer.text: "Custom Server: a8d-961"
 *
 * The player name is a Discord markdown hyperlink to their Roblox profile.
 */
function parseDiscordEmbed(embed: DiscordEmbed): ParsedLog {
  const title = embed.title || "Unknown"
  const description = embed.description || ""
  const footer = embed.footer?.text || ""

  // Determine log type from embed title
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

  // Pattern 1: Discord hyperlinked player — [Username:UserId](https://www.roblox.com/users/UserId/profile) ran the command: ...
  const linkedCmdMatch = description.match(
    /^\[([^\]]+?):(\d+)\]\((https?:\/\/[^\)]+)\)\s+ran the command:\s*(.+)/s
  )
  // Pattern 2: Plain text player — Username:UserId ran the command: ...
  const plainCmdMatch = description.match(
    /^([^\[\]]+?):(\d+)\s+ran the command:\s*(.+)/s
  )
  // Pattern 3: Hyperlinked player doing something generic (not "ran the command")
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

  // Parse footer for server info — "Custom Server: a8d-961"
  let server: string | null = null
  if (footer) {
    const serverMatch = footer.match(/(?:Custom )?Server:\s*(.+)/i)
    if (serverMatch) {
      server = serverMatch[1].trim()
    } else {
      server = footer
    }
  }

  // Check embed fields for extra structured data
  let target: string | null = null
  let targetId: string | null = null
  let targetProfileUrl: string | null = null
  if (embed.fields) {
    for (const field of embed.fields) {
      const name = field.name.toLowerCase()
      if (name.includes("target")) {
        // Target could also be hyperlinked: [Name:Id](url)
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

// POST /api/webhooks/rx/incoming/[webhookId] - Receive log data from Maple game
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params
    console.log("[v0] Incoming webhook hit, webhookId:", webhookId)

    if (!webhookId || webhookId.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook ID" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const botId = "syruprx" as BotId
    if (!isBotConfigured(botId)) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503, headers: CORS_HEADERS }
      )
    }

    const db = await getBotDatabase(botId)
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503, headers: CORS_HEADERS }
      )
    }

    // Look up webhook by ID
    const webhook = await db.collection("webhooks").findOne({ webhookId })
    if (!webhook) {
      console.log("[v0] Webhook not found for ID:", webhookId)
      return NextResponse.json(
        { success: false, error: "Webhook not found" },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    if (webhook.enabled === false) {
      return NextResponse.json(
        { success: false, error: "Webhook is disabled" },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // Parse incoming body — handle any content type
    let body: Record<string, unknown>
    try {
      const rawText = await request.text()
      console.log("[v0] Raw body (first 500 chars):", rawText.substring(0, 500))
      try {
        body = JSON.parse(rawText)
      } catch {
        body = { content: rawText }
      }
    } catch (parseError) {
      console.log("[v0] Failed to read body:", parseError)
      return NextResponse.json(
        { success: false, error: "Failed to parse request body" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Detect and parse Discord embed format
    const embeds = body.embeds as DiscordEmbed[] | undefined
    const isDiscordFormat = Array.isArray(embeds) && embeds.length > 0

    // Process each embed as a separate log entry (usually just one)
    const logEntries = []

    if (isDiscordFormat) {
      for (const embed of embeds) {
        const parsed = parseDiscordEmbed(embed)
        logEntries.push({
          webhookId,
          guildId: webhook.guildId,
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
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      // Non-embed payload (plain text, custom JSON, etc.)
      logEntries.push({
        webhookId,
        guildId: webhook.guildId,
        type: (body.type as string) || "command",
        title: (body.title as string) || "Log",
        action: (body.action as string) || (body.command as string) || "unknown",
        player: body.player || body.executor || body.username || null,
        playerId: body.playerId || body.userId || null,
        target: body.target || null,
        command: body.command || null,
        message: body.message || body.content || body.reason || null,
        server: body.server || null,
        embedColor: null,
        rawEmbed: null,
        rawData: body,
        timestamp: new Date().toISOString(),
      })
    }

    console.log("[v0] Storing", logEntries.length, "log entries for guild:", webhook.guildId)

    // Store all log entries
    if (logEntries.length > 0) {
      await db.collection("webhook_logs").insertMany(logEntries)
    }

    // Update webhook stats
    await db.collection("webhooks").updateOne(
      { webhookId },
      {
        $set: { lastUsedAt: new Date().toISOString() },
        $inc: { totalLogs: logEntries.length },
      }
    )

    // Ensure indexes (idempotent, runs once effectively)
    await db.collection("webhook_logs").createIndex({ guildId: 1, timestamp: -1 }).catch(() => {})
    await db.collection("webhook_logs").createIndex({ webhookId: 1, timestamp: -1 }).catch(() => {})
    await db.collection("webhook_logs").createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 30 * 24 * 60 * 60 }
    ).catch(() => {})

    // Trim old logs if over limit
    const logCount = await db.collection("webhook_logs").countDocuments({ guildId: webhook.guildId })
    if (logCount > MAX_WEBHOOK_LOGS) {
      const excess = logCount - MAX_WEBHOOK_LOGS
      const oldest = await db.collection("webhook_logs")
        .find({ guildId: webhook.guildId })
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

    // Forward to Discord webhook — send the ORIGINAL embed payload as-is
    if (webhook.discordWebhookUrl) {
      try {
        // If the incoming data was already in Discord format, forward it directly
        const discordPayload = isDiscordFormat
          ? {
              content: body.content || undefined,
              username: body.username || "RX Command Logs",
              avatar_url: body.avatar_url || undefined,
              embeds: embeds,
            }
          : {
              username: "RX Command Logs",
              embeds: logEntries.map(entry => ({
                title: entry.title || "Command Log",
                description: [
                  entry.player && `**Executor:** ${entry.player}${entry.playerId ? `:${entry.playerId}` : ""}`,
                  entry.command && `**Command:** \`${entry.command}\``,
                  entry.message && `**Details:** ${String(entry.message).substring(0, 1024)}`,
                  entry.target && `**Target:** ${entry.target}`,
                ].filter(Boolean).join("\n"),
                color: 0x7c3aed,
                footer: entry.server ? { text: `Server: ${entry.server}` } : undefined,
                timestamp: entry.timestamp,
              })),
            }

        await fetch(webhook.discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload),
        })
      } catch (discordError) {
        console.error("[v0] Failed to forward to Discord:", discordError)
      }
    }

    console.log("[v0] Webhook processed successfully for guild:", webhook.guildId)

    return NextResponse.json(
      { success: true, message: "Log received", count: logEntries.length },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[v0] Failed to process incoming webhook:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
