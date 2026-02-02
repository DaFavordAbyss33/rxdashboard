import { NextResponse } from "next/server"
import { BOT_TOKENS, type BotId } from "@/lib/discord"

const DISCORD_API_BASE = "https://discord.com/api/v10"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params
    const { botId } = await request.json()

    if (!botId || !guildId) {
      return NextResponse.json(
        { success: false, error: "Bot ID and Guild ID are required" },
        { status: 400 }
      )
    }

    const token = BOT_TOKENS[botId as BotId]
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Invalid bot ID or token not configured" },
        { status: 400 }
      )
    }

    // Leave the guild using Discord API
    const response = await fetch(
      `${DISCORD_API_BASE}/users/@me/guilds/${guildId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bot ${token}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to leave guild ${guildId}:`, response.status, errorText)
      return NextResponse.json(
        { success: false, error: `Failed to leave guild: ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bot ${botId} has left guild ${guildId}`,
    })
  } catch (error) {
    console.error("Error leaving guild:", error)
    return NextResponse.json(
      { success: false, error: "Failed to leave guild" },
      { status: 500 }
    )
  }
}
