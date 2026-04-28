import { NextResponse } from "next/server"
import { getAllBotsStatus, type BotId } from "@/lib/discord"
import { getGuildStats, BOT_DATABASES } from "@/lib/mongodb"

// Public bot metadata - SyrupRx Free only
const PUBLIC_BOT_METADATA: Record<BotId, {
  name: string
  description: string
  icon: string
  clientId: string
}> = {
  syruprx: {
    name: "SyrupRx",
    description: "Maple Hospital utility and staff management bot",
    icon: "/bots/syruprx.png",
    clientId: process.env.DISCORD_CLIENT_ID_SYRUPRX || process.env.NEXT_PUBLIC_SYRUPRX_CLIENT_ID || "",
  },
}

export async function GET() {
  try {
    // Fetch Discord status for all bots
    const discordStatuses = await getAllBotsStatus().catch(() => [])
    
    const botIds = Object.keys(BOT_DATABASES) as BotId[]
    
    // Fetch guild counts from MongoDB
    const mongoStats = await Promise.all(
      botIds.map(async (botId) => {
        const guildStats = await getGuildStats(botId)
        return { botId, guildStats }
      })
    )

    // Build public bot data
    const bots = botIds.map((botId) => {
      const metadata = PUBLIC_BOT_METADATA[botId]
      if (!metadata) return null
      
      const discordStatus = discordStatuses.find((s) => s.botId === botId)
      const mongoData = mongoStats.find((s) => s.botId === botId)
      
      // Determine status
      let status: "online" | "offline" | "degraded" = "offline"
      if (discordStatus?.online) {
        status = "online"
      }

      // Use Discord guild count if available, otherwise MongoDB
      const guildsCount = discordStatus?.guildsCount || 
        mongoData?.guildStats.totalGuilds || 
        0

      return {
        id: botId,
        name: metadata.name,
        description: metadata.description,
        icon: metadata.icon,
        clientId: metadata.clientId,
        status,
        guildsCount,
      }
    }).filter(Boolean)

    return NextResponse.json({
      bots,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch public bots data:", error)
    return NextResponse.json(
      { error: "Failed to fetch bots data" },
      { status: 500 }
    )
  }
}
