// Discord API client for bot status
const DISCORD_API_BASE = "https://discord.com/api/v10"

export const BOT_TOKENS = {
  syruprx: process.env.DISCORD_BOT_TOKEN_SYRUPRX!,
  swissrx: process.env.DISCORD_BOT_TOKEN_SWISSRX!,
} as const

export type BotId = keyof typeof BOT_TOKENS

interface DiscordApplication {
  id: string
  name: string
  icon: string | null
  description: string
  approximate_guild_count?: number
}

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
}

interface GatewayBot {
  url: string
  shards: number
  session_start_limit: {
    total: number
    remaining: number
    reset_after: number
    max_concurrency: number
  }
}

// Get bot application info from Discord
export async function getBotApplication(botId: BotId): Promise<DiscordApplication | null> {
  const token = BOT_TOKENS[botId]
  
  if (!token) {
    console.error(`Discord token not configured for bot: ${botId}`)
    return null
  }

  try {
    const response = await fetch(`${DISCORD_API_BASE}/oauth2/applications/@me`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      console.error(`Discord API error for ${botId}: ${response.status}`)
      return null
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to fetch Discord application for ${botId}:`, error)
    return null
  }
}

// Get bot user info
export async function getBotUser(botId: BotId): Promise<DiscordUser | null> {
  const token = BOT_TOKENS[botId]
  
  if (!token) {
    return null
  }

  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to fetch Discord user for ${botId}:`, error)
    return null
  }
}

// Get gateway info (includes shard count and session limits)
export async function getGatewayBot(botId: BotId): Promise<GatewayBot | null> {
  const token = BOT_TOKENS[botId]
  
  if (!token) {
    return null
  }

  try {
    const response = await fetch(`${DISCORD_API_BASE}/gateway/bot`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to fetch gateway info for ${botId}:`, error)
    return null
  }
}

// Get guilds the bot is in (limited to first 200)
export async function getBotGuilds(botId: BotId) {
  const token = BOT_TOKENS[botId]
  
  if (!token) {
    return []
  }

  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds?limit=200`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return []
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to fetch guilds for ${botId}:`, error)
    return []
  }
}

// Combined function to get bot status
export async function getBotStatus(botId: BotId) {
  const [application, gateway, guilds] = await Promise.all([
    getBotApplication(botId),
    getGatewayBot(botId),
    getBotGuilds(botId),
  ])

  // If we can't get the application, the bot is likely offline or token is invalid
  const isOnline = application !== null && gateway !== null

  return {
    botId,
    online: isOnline,
    status: isOnline ? "online" : "offline",
    application,
    guildsCount: application?.approximate_guild_count || guilds.length || 0,
    shards: gateway?.shards || 1,
    sessionLimits: gateway?.session_start_limit || null,
  }
}

// Get status for all bots
export async function getAllBotsStatus() {
  const botIds = Object.keys(BOT_TOKENS) as BotId[]
  
  const statuses = await Promise.all(
    botIds.map((botId) => getBotStatus(botId))
  )

  return statuses
}
