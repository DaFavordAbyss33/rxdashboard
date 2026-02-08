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

// POST /api/webhooks/rx/incoming/[webhookId] - Receive log data from Maple game
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params
    console.log("[v0] Incoming webhook hit, webhookId:", webhookId)

    if (!webhookId || webhookId.length < 10) {
      console.log("[v0] Invalid webhook ID, too short or missing")
      return NextResponse.json(
        { success: false, error: "Invalid webhook ID" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const botId = "syruprx" as BotId
    if (!isBotConfigured(botId)) {
      console.log("[v0] Bot not configured:", botId)
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503, headers: CORS_HEADERS }
      )
    }

    const db = await getBotDatabase(botId)
    if (!db) {
      console.log("[v0] Failed to get database for:", botId)
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503, headers: CORS_HEADERS }
      )
    }

    // Look up webhook by ID
    const webhook = await db.collection("webhooks").findOne({ webhookId })
    if (!webhook) {
      console.log("[v0] Webhook not found in database for ID:", webhookId)
      return NextResponse.json(
        { success: false, error: "Webhook not found" },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    console.log("[v0] Webhook found, guild:", webhook.guildId, "enabled:", webhook.enabled)

    if (webhook.enabled === false) {
      return NextResponse.json(
        { success: false, error: "Webhook is disabled" },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    // Parse incoming data - support both JSON and form/text formats
    let body: Record<string, unknown>
    const contentType = request.headers.get("content-type") || ""
    console.log("[v0] Content-Type:", contentType)

    try {
      if (contentType.includes("application/json")) {
        body = await request.json()
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData()
        body = Object.fromEntries(formData.entries())
      } else if (contentType.includes("text/plain")) {
        const text = await request.text()
        try {
          body = JSON.parse(text)
        } catch {
          body = { message: text, type: "raw" }
        }
      } else {
        // Try JSON first, fallback to text
        const rawText = await request.text()
        try {
          body = JSON.parse(rawText)
        } catch {
          body = { message: rawText, type: "raw" }
        }
      }
    } catch (parseError) {
      console.log("[v0] Failed to parse request body:", parseError)
      return NextResponse.json(
        { success: false, error: "Failed to parse request body" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    console.log("[v0] Parsed body:", JSON.stringify(body).substring(0, 500))

    // Build log entry
    const logEntry = {
      webhookId,
      guildId: webhook.guildId,
      type: (body.type as string) || "command",
      action: (body.action as string) || (body.command as string) || "unknown",
      player: body.player || body.executor || body.username || null,
      playerId: body.playerId || body.userId || body.executorId || null,
      target: body.target || body.targetPlayer || null,
      targetId: body.targetId || body.targetPlayerId || null,
      message: body.message || body.reason || body.details || null,
      data: body,
      timestamp: new Date().toISOString(),
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    }

    // Store in webhook_logs collection
    await db.collection("webhook_logs").insertOne(logEntry)

    // Update webhook last used timestamp and total log count
    await db.collection("webhooks").updateOne(
      { webhookId },
      {
        $set: { lastUsedAt: new Date().toISOString() },
        $inc: { totalLogs: 1 },
      }
    )

    // Ensure indexes (idempotent)
    await db.collection("webhook_logs").createIndex({ guildId: 1, timestamp: -1 }).catch(() => {})
    await db.collection("webhook_logs").createIndex({ webhookId: 1, timestamp: -1 }).catch(() => {})
    await db.collection("webhook_logs").createIndex({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }).catch(() => {}) // 30 day TTL

    // Trim old logs if over limit per guild
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

    // Forward to Discord webhook if configured
    if (webhook.discordWebhookUrl) {
      try {
        const embed = buildDiscordEmbed(logEntry)
        await fetch(webhook.discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "RX Command Logs",
            avatar_url: "https://rxdashboard.vercel.app/images/rxsystems.png",
            embeds: [embed],
          }),
        })
      } catch (discordError) {
        // Don't fail the webhook if Discord forwarding fails
        console.error("[webhook] Failed to forward to Discord:", discordError)
      }
    }

    console.log("[v0] Log stored successfully for guild:", webhook.guildId)

    return NextResponse.json(
      { success: true, message: "Log received" },
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

// Build a Discord embed from a log entry
function buildDiscordEmbed(log: Record<string, unknown>) {
  const action = (log.action as string) || "Unknown Action"
  const player = (log.player as string) || "Unknown"
  const target = log.target as string | null
  const message = log.message as string | null
  const type = (log.type as string) || "command"

  // Color based on type
  const colorMap: Record<string, number> = {
    command: 0x7c3aed, // Purple
    moderation: 0xef4444, // Red
    admin: 0xf59e0b, // Amber
    system: 0x3b82f6, // Blue
    join: 0x22c55e, // Green
    leave: 0x6b7280, // Gray
  }

  const fields = [
    { name: "Action", value: `\`${action}\``, inline: true },
    { name: "Executor", value: player, inline: true },
  ]

  if (target) {
    fields.push({ name: "Target", value: target, inline: true })
  }

  if (message) {
    fields.push({ name: "Details", value: message.substring(0, 1024), inline: false })
  }

  return {
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Log`,
    color: colorMap[type.toLowerCase()] || 0x7c3aed,
    fields,
    timestamp: log.timestamp as string,
    footer: {
      text: "RX Systems Webhook",
    },
  }
}
