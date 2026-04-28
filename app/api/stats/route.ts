import { NextResponse } from "next/server"
import { getAllBotsStatus } from "@/lib/discord"
import { getGuildStats, getRecentIncidents, BOT_DATABASES, type BotId } from "@/lib/mongodb"

export async function GET() {
  try {
    const botIds = Object.keys(BOT_DATABASES) as BotId[]

    // Fetch all data in parallel
    const [discordStatuses, mongoData, incidents] = await Promise.all([
      getAllBotsStatus().catch(() => []),
      Promise.all(botIds.map(async (botId) => {
        const guildStats = await getGuildStats(botId)
        return { botId, guildStats }
      })),
      Promise.all(botIds.map(async (botId) => {
        const botIncidents = await getRecentIncidents(botId, 10)
        return botIncidents
      })),
    ])

    // Calculate stats
    const onlineBots = discordStatuses.filter((s) => s.online).length
    const totalBots = botIds.length
    
    const totalGuilds = discordStatuses.reduce((acc, s) => acc + (s.guildsCount || 0), 0) ||
      mongoData.reduce((acc, s) => acc + (s.guildStats.totalGuilds || 0), 0)
    
    // Count open incidents (errors and warnings)
    const allIncidents = incidents.flat()
    const openIncidents = allIncidents.filter(
      (i) => i.type === "error" || i.type === "warning"
    ).length

    return NextResponse.json({
      bots: {
        online: onlineBots,
        total: totalBots,
        allOnline: onlineBots === totalBots,
      },
      guilds: {
        total: totalGuilds,
      },
      incidents: {
        open: openIncidents,
        total: allIncidents.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
