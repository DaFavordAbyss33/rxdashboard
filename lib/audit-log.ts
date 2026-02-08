import { getBotDatabase, isBotConfigured, type BotId } from "@/lib/mongodb"

const MAX_AUDIT_LOGS = 20000

export interface AuditLogEntry {
  _id?: string
  botId: string
  guildId: string
  guildName?: string
  action: string
  category: "moderation" | "config" | "server" | "system"
  details: Record<string, unknown>
  executedBy: {
    id: string
    username: string
    discriminator?: string
    avatar?: string
  }
  targetUser?: {
    id: string | number
    name?: string
  }
  success: boolean
  error?: string
  timestamp: string
}

/**
 * Write an audit log entry to the bot's database.
 * Caps at 20,000 entries by deleting the oldest when the limit is reached.
 */
export async function writeAuditLog(
  botId: BotId,
  entry: Omit<AuditLogEntry, "timestamp">
): Promise<boolean> {
  if (!isBotConfigured(botId)) {
    return false
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return false

    const collection = db.collection("audit_logs")

    // Ensure index on timestamp for efficient sorting/cleanup
    // (idempotent - won't recreate if exists)
    await collection.createIndex({ timestamp: -1 }).catch(() => {})
    await collection.createIndex({ guildId: 1, timestamp: -1 }).catch(() => {})
    await collection.createIndex({ botId: 1, guildId: 1, timestamp: -1 }).catch(() => {})

    // Insert the new log entry
    await collection.insertOne({
      ...entry,
      timestamp: new Date().toISOString(),
    })

    // Check count and trim if over the limit
    const count = await collection.countDocuments()
    if (count > MAX_AUDIT_LOGS) {
      const excess = count - MAX_AUDIT_LOGS
      // Find the oldest entries and delete them
      const oldest = await collection
        .find({})
        .sort({ timestamp: 1 })
        .limit(excess)
        .project({ _id: 1 })
        .toArray()

      if (oldest.length > 0) {
        const idsToDelete = oldest.map((doc) => doc._id)
        await collection.deleteMany({ _id: { $in: idsToDelete } })
      }
    }

    return true
  } catch (error) {
    console.error(`[audit-log] Failed to write audit log for ${botId}:`, error)
    return false
  }
}

/**
 * Read audit log entries for a specific guild.
 */
export async function readAuditLogs(
  botId: BotId,
  guildId: string,
  options: {
    page?: number
    limit?: number
    category?: string
    action?: string
    search?: string
  } = {}
): Promise<{ logs: AuditLogEntry[]; total: number; page: number; totalPages: number }> {
  const { page = 1, limit = 50, category, action, search } = options

  if (!isBotConfigured(botId)) {
    return { logs: [], total: 0, page: 1, totalPages: 0 }
  }

  try {
    const db = await getBotDatabase(botId)
    if (!db) return { logs: [], total: 0, page: 1, totalPages: 0 }

    const collection = db.collection("audit_logs")

    // Build query
    const query: Record<string, unknown> = { guildId }
    if (category) query.category = category
    if (action) query.action = action
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: "i" } },
        { "executedBy.username": { $regex: search, $options: "i" } },
        { "targetUser.name": { $regex: search, $options: "i" } },
        { "details.message": { $regex: search, $options: "i" } },
      ]
    }

    const total = await collection.countDocuments(query)
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    const logs = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      logs: logs.map((doc) => ({
        ...doc,
        _id: doc._id.toString(),
      })) as unknown as AuditLogEntry[],
      total,
      page,
      totalPages,
    }
  } catch (error) {
    console.error(`[audit-log] Failed to read audit logs for ${botId}:`, error)
    return { logs: [], total: 0, page: 1, totalPages: 0 }
  }
}
