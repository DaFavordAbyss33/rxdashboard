import { NextResponse } from "next/server"
import { getBotGuilds, type BotId, BOT_TOKENS } from "@/lib/discord"

export const dynamic = "force-dynamic"

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
  features: string[]
}

// GET /api/bots/[botId]/guilds - Get all guilds a bot is installed in
export async function GET(
  request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params

    // Validate botId
    if (!BOT_TOKENS[botId as BotId]) {
      return NextResponse.json(
        { success: false, error: "Invalid bot ID" },
        { status: 400 }
      )
    }

    // Fetch guilds from Discord API
    const guilds = await getBotGuilds(botId as BotId) as DiscordGuild[]

    // Transform the response
    const formattedGuilds = guilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      iconUrl: guild.icon 
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : null,
      features: guild.features || [],
    }))

    return NextResponse.json({
      success: true,
      botId,
      guilds: formattedGuilds,
      count: formattedGuilds.length,
    })
  } catch (error) {
    console.error("Failed to fetch bot guilds:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch guilds" },
      { status: 500 }
    )
  }
}
