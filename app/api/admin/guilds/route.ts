import { NextResponse } from "next/server"
import { getBotGuilds, BOT_TOKENS, type BotId } from "@/lib/discord"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const botIds = Object.keys(BOT_TOKENS) as BotId[]
    
    const allGuilds = await Promise.all(
      botIds.map(async (botId) => {
        const guilds = await getBotGuilds(botId)
        return {
          botId,
          guilds: guilds.map((guild: any) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: guild.approximate_member_count || 0,
            botId,
          })),
        }
      })
    )

    return NextResponse.json({ 
      success: true,
      data: allGuilds,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch admin guilds:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch guilds" },
      { status: 500 }
    )
  }
}
