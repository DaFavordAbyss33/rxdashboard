import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, isBotConfigured, BOT_DATABASES, type BotId } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// Get the authenticated user's Discord ID from session cookie
async function getAuthenticatedUserId(): Promise<{ userId: string; username: string } | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")

  if (!sessionCookie) return null

  try {
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    const username = session.user?.username

    if (!userId || userId.length < 17) return null
    if (session.expiresAt && Date.now() > session.expiresAt) return null

    return { userId, username: username || "unknown" }
  } catch {
    return null
  }
}

// GET /api/user/tracking-preferences - Fetch current opt-out preferences
export async function GET() {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    )
  }

  try {
    // Read from the first configured bot database (preferences are synced across all)
    const botIds = Object.keys(BOT_DATABASES) as BotId[]
    let preferences = null

    for (const botId of botIds) {
      if (!isBotConfigured(botId)) continue

      const db = await getBotDatabase(botId)
      if (!db) continue

      const record = await db.collection("tracking_optouts").findOne({
        discordUserId: auth.userId,
      })

      if (record) {
        preferences = {
          presence: record.presence !== false, // default true (tracking enabled)
          members: record.members !== false,
          messages: record.messages !== false,
          updatedAt: record.updatedAt || null,
        }
        break
      } else {
        // No record means all tracking is enabled (default)
        preferences = {
          presence: true,
          members: true,
          messages: true,
          updatedAt: null,
        }
        break
      }
    }

    if (!preferences) {
      // No databases configured - return defaults
      preferences = {
        presence: true,
        members: true,
        messages: true,
        updatedAt: null,
      }
    }

    return NextResponse.json({ success: true, preferences })
  } catch (error) {
    console.error("[tracking-preferences] Failed to fetch:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch tracking preferences" },
      { status: 500 }
    )
  }
}

// PUT /api/user/tracking-preferences - Update opt-out preferences across ALL bot databases
export async function PUT(request: Request) {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { presence, members, messages } = body

    // Validate booleans
    if (typeof presence !== "boolean" || typeof members !== "boolean" || typeof messages !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid preference values. Expected booleans for presence, members, and messages." },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const botIds = Object.keys(BOT_DATABASES) as BotId[]
    const results: { botId: string; success: boolean; error?: string }[] = []

    // Write to ALL configured bot databases so every bot respects the opt-out
    for (const botId of botIds) {
      if (!isBotConfigured(botId)) continue

      try {
        const db = await getBotDatabase(botId)
        if (!db) {
          results.push({ botId, success: false, error: "Database connection failed" })
          continue
        }

        // Ensure index exists for fast lookups by Discord user ID
        await db.collection("tracking_optouts").createIndex(
          { discordUserId: 1 },
          { unique: true }
        ).catch(() => {
          // Index may already exist
        })

        await db.collection("tracking_optouts").updateOne(
          { discordUserId: auth.userId },
          {
            $set: {
              discordUserId: auth.userId,
              discordUsername: auth.username,
              presence,
              members,
              messages,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true }
        )

        results.push({ botId, success: true })
      } catch (error) {
        console.error(`[tracking-preferences] Failed to write to ${botId}:`, error)
        results.push({
          botId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    if (successCount === 0 && failCount > 0) {
      return NextResponse.json(
        { success: false, error: "Failed to save preferences to any bot database" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message:
        failCount > 0
          ? `Preferences saved to ${successCount} of ${successCount + failCount} bot databases`
          : "Tracking preferences saved across all bots",
      syncResults: results,
    })
  } catch (error) {
    console.error("[tracking-preferences] Failed to update:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update tracking preferences" },
      { status: 500 }
    )
  }
}
