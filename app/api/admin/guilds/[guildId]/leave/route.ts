import { NextResponse } from "next/server"
import { BOT_TOKENS, type BotId } from "@/lib/discord"
import { queueBotCommand, isBotConfigured } from "@/lib/mongodb"

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
      // If no bot token, try to queue the command for the bot to execute
      if (isBotConfigured(botId)) {
        const queued = await queueBotCommand(botId, {
          type: "leave_guild",
          data: { guildId },
          priority: "high",
        })
        
        if (queued) {
          return NextResponse.json({ 
            success: true, 
            message: `Leave command queued for ${botId}. Bot will process it shortly.`,
            method: "queued",
          })
        }
      }
      
      return NextResponse.json(
        { success: false, error: "Invalid bot ID or token not configured" },
        { status: 400 }
      )
    }

    // Leave the guild using Discord API directly
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
      
      // If direct API fails, try queuing the command
      if (isBotConfigured(botId)) {
        const queued = await queueBotCommand(botId, {
          type: "leave_guild",
          data: { guildId },
          priority: "high",
        })
        
        if (queued) {
          return NextResponse.json({ 
            success: true, 
            message: `Direct API failed, leave command queued for ${botId}.`,
            method: "queued",
          })
        }
      }
      
      return NextResponse.json(
        { success: false, error: `Failed to leave guild: ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Bot ${botId} has left guild ${guildId}`,
      method: "direct",
    })
  } catch (error) {
    console.error("Error leaving guild:", error)
    return NextResponse.json(
      { success: false, error: "Failed to leave guild" },
      { status: 500 }
    )
  }
}
