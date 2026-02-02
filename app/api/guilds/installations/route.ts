import { NextResponse } from "next/server"
import { BOT_TOKENS, type BotId } from "@/lib/discord"

const DISCORD_API_BASE = "https://discord.com/api/v10"

export const dynamic = "force-dynamic"

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
}

// Fetch all guilds for all configured bots in parallel
export async function GET() {
  try {
    const botIds = Object.keys(BOT_TOKENS) as BotId[]
    
    // Fetch guilds for all bots in parallel
    const results = await Promise.all(
      botIds.map(async (botId) => {
        const token = BOT_TOKENS[botId]
        if (!token) {
          return { botId, guilds: [] }
        }

        try {
          const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
            headers: {
              Authorization: `Bot ${token}`,
            },
            next: { revalidate: 60 }, // Cache for 60 seconds
          })

          if (!response.ok) {
            console.warn(`[api/guilds/installations] Failed to fetch guilds for ${botId}: ${response.status}`)
            return { botId, guilds: [] }
          }

          const guilds: DiscordGuild[] = await response.json()
          return {
            botId,
            guilds: guilds.map((g) => ({
              id: g.id,
              name: g.name,
              icon: g.icon,
            })),
          }
        } catch (error) {
          console.error(`[api/guilds/installations] Error fetching guilds for ${botId}:`, error)
          return { botId, guilds: [] }
        }
      })
    )

    // Convert to a map of botId -> guilds
    const installations: Record<string, { id: string; name: string; icon: string | null }[]> = {}
    results.forEach(({ botId, guilds }) => {
      installations[botId] = guilds
    })

    return NextResponse.json({
      success: true,
      installations,
    })
  } catch (error) {
    console.error("[api/guilds/installations] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch installations" },
      { status: 500 }
    )
  }
}
