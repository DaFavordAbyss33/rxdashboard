import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { BOT_TOKENS, type BotId } from "@/lib/discord"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"

// In-memory store for sent DMs history (in production, use a database)
const sentDMs: Array<{
  id: string
  botId: string
  message: string
  sentBy: string
  sentAt: string
  recipientCount: number
  successCount: number
  failedGuilds: string[]
}> = []

// Get guild info including owner_id
async function getGuildInfo(botId: BotId, guildId: string) {
  const token = BOT_TOKENS[botId]
  if (!token) return null

  try {
    const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    })

    if (!response.ok) return null
    return response.json()
  } catch (error) {
    console.error(`[general-dm] Failed to get guild ${guildId}:`, error)
    return null
  }
}

// Create a DM channel with a user
async function createDMChannel(botId: BotId, userId: string) {
  const token = BOT_TOKENS[botId]
  if (!token) return null

  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: userId }),
    })

    if (!response.ok) {
      console.error(`[general-dm] Failed to create DM channel: ${response.status}`)
      return null
    }
    return response.json()
  } catch (error) {
    console.error(`[general-dm] Failed to create DM channel:`, error)
    return null
  }
}

// Send a message to a DM channel as an embed (no message content)
async function sendDM(botId: BotId, channelId: string, content: string) {
  const token = BOT_TOKENS[botId]
  if (!token) return false

  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Only send the embed, no plain text content
        embeds: [{
          title: "Notice from RxSystems",
          description: content,
          color: 0x5865F2, // Discord blurple for general/non-urgent notices
          timestamp: new Date().toISOString(),
          footer: {
            text: "This is a general notification from RxSystems",
          },
        }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`[general-dm] Failed to send DM: ${response.status}`, errorData)
      return false
    }
    return true
  } catch (error) {
    console.error(`[general-dm] Failed to send DM:`, error)
    return false
  }
}

// GET - Fetch sent DMs history
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("discord_session")

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      history: sentDMs.slice(-20).reverse(),
    })
  } catch (error) {
    console.error("[general-dm] Failed to fetch history:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch history" },
      { status: 500 }
    )
  }
}

// POST - Send general DMs to guild owners
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("discord_session")

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    let session
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      )
    }

    const { message, botId, guildIds } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      )
    }

    if (!botId || !BOT_TOKENS[botId as BotId]) {
      return NextResponse.json(
        { success: false, error: "Valid bot ID is required" },
        { status: 400 }
      )
    }

    // If no specific guilds, get all guilds for this bot
    let targetGuildIds: string[] = guildIds || []
    
    if (targetGuildIds.length === 0) {
      // Fetch all guilds for the bot
      const token = BOT_TOKENS[botId as BotId]
      try {
        const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds?limit=200`, {
          headers: { Authorization: `Bot ${token}` },
        })
        if (response.ok) {
          const guilds = await response.json()
          targetGuildIds = guilds.map((g: { id: string }) => g.id)
        }
      } catch (error) {
        console.error("[general-dm] Failed to fetch guilds:", error)
      }
    }

    if (targetGuildIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No guilds found to notify" },
        { status: 400 }
      )
    }

    // Track unique owners to avoid duplicate DMs
    const notifiedOwners = new Set<string>()
    let successCount = 0
    const failedGuilds: string[] = []

    for (const guildId of targetGuildIds) {
      try {
        // Get guild info to find owner
        const guildInfo = await getGuildInfo(botId as BotId, guildId)
        if (!guildInfo || !guildInfo.owner_id) {
          failedGuilds.push(guildId)
          continue
        }

        // Skip if we already notified this owner
        if (notifiedOwners.has(guildInfo.owner_id)) {
          continue
        }

        // Create DM channel and send message
        const dmChannel = await createDMChannel(botId as BotId, guildInfo.owner_id)
        if (!dmChannel) {
          failedGuilds.push(guildId)
          continue
        }

        const sent = await sendDM(botId as BotId, dmChannel.id, message.trim())
        if (sent) {
          successCount++
          notifiedOwners.add(guildInfo.owner_id)
        } else {
          failedGuilds.push(guildId)
        }

        // Rate limiting - Discord has limits on DMs
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`[general-dm] Error processing guild ${guildId}:`, error)
        failedGuilds.push(guildId)
      }
    }

    // Store in history
    const dmRecord = {
      id: `dm_${Date.now()}`,
      botId,
      message: message.trim(),
      sentBy: session.user?.username || "admin",
      sentAt: new Date().toISOString(),
      recipientCount: targetGuildIds.length,
      successCount,
      failedGuilds,
    }
    sentDMs.push(dmRecord)

    return NextResponse.json({
      success: true,
      message: `Sent general notices to ${successCount} guild owner(s)`,
      successCount,
      failedCount: failedGuilds.length,
      failedGuilds: failedGuilds.slice(0, 10),
    })
  } catch (error) {
    console.error("[general-dm] Failed to send DMs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to send DMs" },
      { status: 500 }
    )
  }
}
