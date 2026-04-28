import { NextResponse } from "next/server"
import { getAllBotsStatus, type BotId } from "@/lib/discord"
import { getGuildStats, BOT_DATABASES } from "@/lib/mongodb"

// Bot metadata for SyrupRx and SwissRx
const BOT_METADATA: Record<BotId, {
  name: string
  description: string
  icon: string
  clientId: string
  inviteScopes: string[]
  permissionsInt: string
  capabilities: {
    channels?: string[]
    keys?: string[]
    features?: string[]
  }
}> = {
  syruprx: {
    name: "SyrupRx",
    description: "Maple Hospital utility and staff management bot",
    icon: "/bots/syruprx.png",
    clientId: process.env.DISCORD_CLIENT_ID_SYRUPRX || process.env.NEXT_PUBLIC_SYRUPRX_CLIENT_ID || "",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["staffLogs", "modLogs", "sessionChannel", "pagerChannel"],
      keys: ["marizmaApiKey", "robloxGroupId"],
      features: [
        "Server Management",
        "Staff Logging",
        "Pager System",
        "Auto Replies",
        "Auto Announcements",
        "Moderation Logs",
      ],
    },
  },
  swissrx: {
    name: "SwissRx",
    description: "Private hospital management bot for Swiss Hospital",
    icon: "/bots/swissrx.png",
    clientId: process.env.DISCORD_CLIENT_ID_SWISSRX || process.env.NEXT_PUBLIC_SWISSRX_CLIENT_ID || "",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["staffLogs", "modLogs", "sessionChannel", "pagerChannel"],
      keys: ["marizmaApiKey", "robloxGroupId"],
      features: [
        "Server Management",
        "Staff Logging",
        "Pager System",
        "Auto Replies",
        "Auto Announcements",
        "Moderation Logs",
      ],
    },
  },
}

export async function GET() {
  try {
    const botIds = Object.keys(BOT_DATABASES) as BotId[]

    // Fetch all sources in parallel
    const [discordStatuses, mongoStats] = await Promise.all([
      getAllBotsStatus().catch((err) => {
        console.error("[bots] Discord status fetch failed:", err)
        return [] as Awaited<ReturnType<typeof getAllBotsStatus>>
      }),
      Promise.all(botIds.map(async (botId) => {
        const guildStats = await getGuildStats(botId)
        return { botId, guildStats }
      })),
    ])

    // Build combined bot data
    const bots = botIds.map((botId) => {
      const metadata = BOT_METADATA[botId]
      if (!metadata) return null
      
      const discordStatus = discordStatuses.find((s) => s.botId === botId)
      const mongoData = mongoStats.find((s) => s.botId === botId)

      // Determine status based on Discord API response
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
        inviteScopes: metadata.inviteScopes,
        permissionsInt: metadata.permissionsInt,
        capabilities: metadata.capabilities,
        status,
        guildsCount,
        wsPing: 0,
        uptime: "N/A",
        mongoConnected: mongoData?.guildStats.connected ?? false,
        discordConnected: discordStatus?.online ?? false,
      }
    }).filter(Boolean)

    return NextResponse.json({
      bots,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch bots data:", error)
    return NextResponse.json(
      { error: "Failed to fetch bots data" },
      { status: 500 }
    )
  }
}
