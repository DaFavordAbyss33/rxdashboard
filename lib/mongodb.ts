import { MongoClient, Db } from "mongodb"

// v4: Completely rewritten MongoDB client with graceful error handling
// Bot database configuration - check if env vars exist before using
export const BOT_DATABASES = {
  syruprx: {
    uri: process.env.MONGODB_URI_SYRUPRX || "",
    name: "SyrupRx",
  },
  "syruprx-pro": {
    uri: process.env.MONGODB_URI_SYRUPRX_PRO || "",
    name: "SyrupRx PRO",
  },
  autoclockrx: {
    uri: process.env.MONGODB_URI_AUTOCLOCKRX || "",
    name: "AutoclockRx",
  },
  mednoterx: {
    uri: process.env.MONGODB_URI_MEDNOTERX || "",
    name: "MedNoteRx",
  },
  swissrx: {
    uri: process.env.MONGODB_URI_SWISSRX || "",
    name: "SwissRx",
  },
} as const

export type BotId = keyof typeof BOT_DATABASES

// Check if a bot has MongoDB configured
export function isBotConfigured(botId: BotId): boolean {
  const config = BOT_DATABASES[botId]
  return Boolean(config?.uri && config.uri.length > 0)
}

// Cache connections to avoid creating new connections on every request
const clientCache: Map<string, MongoClient> = new Map()

// GRACEFUL ERROR HANDLING - Returns null instead of throwing
export async function getMongoClient(botId: BotId): Promise<MongoClient | null> {
  const config = BOT_DATABASES[botId]
  
  // Graceful return if not configured - DO NOT THROW
  if (!config?.uri || config.uri.length === 0) {
    console.warn(`[mongodb] URI not configured for bot: ${botId}`)
    return null
  }

  // Return cached client if exists
  if (clientCache.has(botId)) {
    return clientCache.get(botId)!
  }

  try {
    // Create new client
    const client = new MongoClient(config.uri)
    await client.connect()
    clientCache.set(botId, client)
    return client
  } catch (error) {
    console.error(`[mongodb] Failed to connect for ${botId}:`, error)
    return null
  }
}

export async function getBotDatabase(botId: BotId): Promise<Db | null> {
  const client = await getMongoClient(botId)
  if (!client) return null
  return client.db()
}

// Get guild stats from a bot's database
export async function getGuildStats(botId: BotId) {
  // Check configuration first - return gracefully if not configured
  if (!isBotConfigured(botId)) {
    return {
      totalGuilds: 0,
      connected: false,
      error: "MongoDB not configured",
    }
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) {
      return {
        totalGuilds: 0,
        connected: false,
        error: "Failed to connect to database",
      }
    }
    
    // Common collection names - adjust based on your actual schema
    const guildsCollection = db.collection("guilds")
    const totalGuilds = await guildsCollection.countDocuments()
    
    return {
      totalGuilds,
      connected: true,
    }
  } catch (error) {
    console.error(`[mongodb] Failed to get guild stats for ${botId}:`, error)
    return {
      totalGuilds: 0,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Get subscription/premium data from a bot's database
export async function getSubscriptionStats(botId: BotId) {
  // Check configuration first - return gracefully if not configured
  if (!isBotConfigured(botId)) {
    return {
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      connected: false,
    }
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) {
      return {
        activeSubscriptions: 0,
        totalSubscriptions: 0,
        connected: false,
      }
    }
    
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
    console.error(`[mongodb] Failed to get subscription stats for ${botId}:`, error)
    return {
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      connected: false,
    }
  }
}

// Get recent logs/incidents from a bot's database
export async function getRecentIncidents(botId: BotId, limit: number = 10) {
  // Check configuration first - return gracefully if not configured
  if (!isBotConfigured(botId)) {
    return []
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) {
      return []
    }
    
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
    console.error(`[mongodb] Failed to get incidents for ${botId}:`, error)
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

// =============================================
// BOT SYNC FUNCTIONS - Dashboard -> Bot Communication
// =============================================

export interface BotSettings {
  maintenanceMode: boolean
  debugLogging: boolean
  autoRestart: boolean
  customStatus: string
  commandPrefix: string
  enabledFeatures: string[]
  updatedAt: string
  updatedBy?: string
}

export interface SubscriptionRecord {
  odiscordUserId: string
  odiscordGuildId: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  plan: string
  status: "active" | "canceled" | "past_due" | "trialing" | "expired"
  features: string[]
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

// Get bot settings from MongoDB
export async function getBotSettings(botId: BotId): Promise<BotSettings | null> {
  if (!isBotConfigured(botId)) {
    return null
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return null

    const settingsCollection = db.collection("settings")
    const settings = await settingsCollection.findOne({ type: "global" })
    
    if (!settings?.data) {
      // Return defaults if no settings exist
      return {
        maintenanceMode: false,
        debugLogging: false,
        autoRestart: true,
        customStatus: "",
        commandPrefix: "!",
        enabledFeatures: [],
        updatedAt: new Date().toISOString(),
      }
    }
    
    return settings.data as BotSettings
  } catch (error) {
    console.error(`[mongodb] Failed to get settings for ${botId}:`, error)
    return null
  }
}

// Update bot settings in MongoDB - bots will poll/watch for changes
export async function updateBotSettings(
  botId: BotId, 
  settings: Partial<BotSettings>,
  updatedBy?: string
): Promise<boolean> {
  if (!isBotConfigured(botId)) {
    return false
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return false

    const settingsCollection = db.collection("settings")
    
    // Get current settings to merge
    const current = await settingsCollection.findOne({ type: "global" })
    const currentData = current?.data || {}
    
    const newSettings = {
      ...currentData,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy,
    }

    await settingsCollection.updateOne(
      { type: "global" },
      { 
        $set: { 
          data: newSettings,
          updatedAt: new Date().toISOString(),
        } 
      },
      { upsert: true }
    )

    return true
  } catch (error) {
    console.error(`[mongodb] Failed to update settings for ${botId}:`, error)
    return false
  }
}

// Get subscription status for a user/guild
export async function getSubscription(
  botId: BotId,
  discordUserId?: string,
  discordGuildId?: string
): Promise<SubscriptionRecord | null> {
  if (!isBotConfigured(botId)) {
    return null
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return null

    const subscriptionsCollection = db.collection("subscriptions")
    
    const query: Record<string, string> = {}
    if (discordUserId) query.discordUserId = discordUserId
    if (discordGuildId) query.discordGuildId = discordGuildId
    
    const subscription = await subscriptionsCollection.findOne(query)
    return subscription as SubscriptionRecord | null
  } catch (error) {
    console.error(`[mongodb] Failed to get subscription for ${botId}:`, error)
    return null
  }
}

// Create or update subscription - syncs Stripe data to bot database
export async function syncSubscription(
  botId: BotId,
  subscription: Partial<SubscriptionRecord> & { discordUserId: string }
): Promise<boolean> {
  if (!isBotConfigured(botId)) {
    return false
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return false

    const subscriptionsCollection = db.collection("subscriptions")
    
    await subscriptionsCollection.updateOne(
      { discordUserId: subscription.discordUserId },
      { 
        $set: {
          ...subscription,
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    )

    return true
  } catch (error) {
    console.error(`[mongodb] Failed to sync subscription for ${botId}:`, error)
    return false
  }
}

// Cancel/expire a subscription
export async function cancelSubscription(
  botId: BotId,
  discordUserId: string
): Promise<boolean> {
  if (!isBotConfigured(botId)) {
    return false
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return false

    const subscriptionsCollection = db.collection("subscriptions")
    
    await subscriptionsCollection.updateOne(
      { discordUserId },
      { 
        $set: {
          status: "canceled",
          updatedAt: new Date().toISOString(),
        }
      }
    )

    return true
  } catch (error) {
    console.error(`[mongodb] Failed to cancel subscription for ${botId}:`, error)
    return false
  }
}

// Queue a command for the bot to execute (e.g., leave server)
export async function queueBotCommand(
  botId: BotId,
  command: {
    type: "leave_guild" | "restart" | "update_status" | "sync_roles"
    data: Record<string, unknown>
    priority?: "high" | "normal" | "low"
  }
): Promise<boolean> {
  if (!isBotConfigured(botId)) {
    return false
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return false

    const commandsCollection = db.collection("commands")
    
    await commandsCollection.insertOne({
      ...command,
      status: "pending",
      priority: command.priority || "normal",
      createdAt: new Date().toISOString(),
    })

    return true
  } catch (error) {
    console.error(`[mongodb] Failed to queue command for ${botId}:`, error)
    return false
  }
}

// Get pending commands for a bot (bot calls this to get work)
export async function getPendingCommands(botId: BotId, limit: number = 10) {
  if (!isBotConfigured(botId)) {
    return []
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return []

    const commandsCollection = db.collection("commands")
    
    const commands = await commandsCollection
      .find({ status: "pending" })
      .sort({ priority: 1, createdAt: 1 })
      .limit(limit)
      .toArray()

    return commands
  } catch (error) {
    console.error(`[mongodb] Failed to get pending commands for ${botId}:`, error)
    return []
  }
}

// Mark a command as completed
export async function completeCommand(
  botId: BotId,
  commandId: string,
  result: { success: boolean; error?: string }
): Promise<boolean> {
  if (!isBotConfigured(botId)) {
    return false
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return false

    const { ObjectId } = await import("mongodb")
    const commandsCollection = db.collection("commands")
    
    await commandsCollection.updateOne(
      { _id: new ObjectId(commandId) },
      { 
        $set: {
          status: result.success ? "completed" : "failed",
          result,
          completedAt: new Date().toISOString(),
        }
      }
    )

    return true
  } catch (error) {
    console.error(`[mongodb] Failed to complete command for ${botId}:`, error)
    return false
  }
}
