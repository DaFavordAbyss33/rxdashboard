import { MongoClient, Db } from "mongodb"

// Bot database configuration
export const BOT_DATABASES = {
  syruprx: {
    uri: process.env.MONGODB_URI_SYRUPRX!,
    name: "SyrupRx",
  },
  "syruprx-pro": {
    uri: process.env.MONGODB_URI_SYRUPRX_PRO!,
    name: "SyrupRx PRO",
  },
  autoclockrx: {
    uri: process.env.MONGODB_URI_AUTOCLOCKRX!,
    name: "AutoclockRx",
  },
  mednoterx: {
    uri: process.env.MONGODB_URI_MEDNOTERX!,
    name: "MedNoteRx",
  },
  swissrx: {
    uri: process.env.MONGODB_URI_SWISSRX!,
    name: "SwissRx",
  },
} as const

export type BotId = keyof typeof BOT_DATABASES

// Cache connections to avoid creating new connections on every request
const clientCache: Map<string, MongoClient> = new Map()

export async function getMongoClient(botId: BotId): Promise<MongoClient> {
  const config = BOT_DATABASES[botId]
  
  if (!config?.uri) {
    throw new Error(`MongoDB URI not configured for bot: ${botId}`)
  }

  // Return cached client if exists
  if (clientCache.has(botId)) {
    return clientCache.get(botId)!
  }

  // Create new client
  const client = new MongoClient(config.uri)
  await client.connect()
  
  clientCache.set(botId, client)
  return client
}

export async function getBotDatabase(botId: BotId): Promise<Db> {
  const client = await getMongoClient(botId)
  return client.db()
}

// Get guild stats from a bot's database
export async function getGuildStats(botId: BotId) {
  try {
    const db = await getBotDatabase(botId)
    
    // Common collection names - adjust based on your actual schema
    const guildsCollection = db.collection("guilds")
    const totalGuilds = await guildsCollection.countDocuments()
    
    return {
      totalGuilds,
      connected: true,
    }
  } catch (error) {
    console.error(`Failed to get guild stats for ${botId}:`, error)
    return {
      totalGuilds: 0,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Get subscription/premium data from a bot's database
export async function getSubscriptionStats(botId: BotId) {
  try {
    const db = await getBotDatabase(botId)
    
    // Common collection names - adjust based on your actual schema
    const subscriptionsCollection = db.collection("subscriptions")
    const activeSubscriptions = await subscriptionsCollection.countDocuments({
      status: { $in: ["active", "trialing"] },
    })
    const totalSubscriptions = await subscriptionsCollection.countDocuments()
    
    return {
      activeSubscriptions,
      totalSubscriptions,
      connected: true,
    }
  } catch (error) {
    console.error(`Failed to get subscription stats for ${botId}:`, error)
    return {
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      connected: false,
    }
  }
}

// Get recent logs/incidents from a bot's database
export async function getRecentIncidents(botId: BotId, limit: number = 10) {
  try {
    const db = await getBotDatabase(botId)
    
    // Try common collection names for logs
    const logsCollection = db.collection("logs")
    const incidents = await logsCollection
      .find({ level: { $in: ["error", "warn", "warning"] } })
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(limit)
      .toArray()
    
    return incidents.map((doc) => ({
      id: doc._id.toString(),
      botId,
      type: doc.level === "error" ? "error" : doc.level === "warn" || doc.level === "warning" ? "warning" : "info",
      message: doc.message || doc.msg || "Unknown error",
      stack: doc.stack,
      createdAt: doc.timestamp || doc.createdAt || new Date().toISOString(),
    }))
  } catch (error) {
    console.error(`Failed to get incidents for ${botId}:`, error)
    return []
  }
}

// Close all connections (for cleanup)
export async function closeAllConnections() {
  for (const [botId, client] of clientCache) {
    await client.close()
    clientCache.delete(botId)
  }
}
