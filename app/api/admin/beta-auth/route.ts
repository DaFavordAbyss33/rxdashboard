import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"

export const dynamic = "force-dynamic"

const COLLECTION_NAME = "beta_authorizations"

// Verify admin access
async function verifyAdmin(): Promise<{ authorized: boolean; userId?: string }> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")
  if (!sessionCookie) return { authorized: false }

  try {
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id
    if (!userId) return { authorized: false }
    if (session.isAdmin === true || isMasterUser(userId)) {
      return { authorized: true, userId }
    }
    return { authorized: false }
  } catch {
    return { authorized: false }
  }
}

// GET - List all beta authorized guilds
export async function GET() {
  const { authorized } = await verifyAdmin()
  if (!authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
  }

  try {
    const db = await getBotDatabase("syruprx")
    if (!db) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 })
    }

    const authorizations = await db.collection(COLLECTION_NAME)
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      authorizations: authorizations.map((auth) => ({
        id: auth._id.toString(),
        guildId: auth.guildId,
        guildName: auth.guildName || null,
        guildIcon: auth.guildIcon || null,
        roleIds: auth.roleIds || [],
        roleNames: auth.roleNames || [],
        addedBy: auth.addedBy || null,
        createdAt: auth.createdAt,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch beta authorizations:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 })
  }
}

// POST - Add a new authorized guild with roles
export async function POST(request: Request) {
  const { authorized, userId } = await verifyAdmin()
  if (!authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { guildId, roleIds } = body

    if (!guildId || typeof guildId !== "string") {
      return NextResponse.json({ success: false, error: "Guild ID is required" }, { status: 400 })
    }

    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
      return NextResponse.json({ success: false, error: "At least one role ID is required" }, { status: 400 })
    }

    const db = await getBotDatabase("syruprx")
    if (!db) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 })
    }

    // Use bot token to fetch guild info
    const { BOT_TOKENS } = await import("@/lib/discord")
    const botToken = BOT_TOKENS.syruprx
    let guildName = null
    let guildIcon = null
    let roleNames: string[] = []

    if (botToken) {
      // Fetch guild info
      try {
        const guildResponse = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}`,
          { headers: { Authorization: `Bot ${botToken}` } }
        )
        if (guildResponse.ok) {
          const guildData = await guildResponse.json()
          guildName = guildData.name
          guildIcon = guildData.icon

          // Match role names from guild roles
          const guildRoles = guildData.roles || []
          roleNames = roleIds.map((roleId: string) => {
            const role = guildRoles.find((r: { id: string; name: string }) => r.id === roleId)
            return role?.name || roleId
          })
        }
      } catch (err) {
        console.error("Failed to fetch guild info:", err)
      }
    }

    // Check if guild already exists
    const existing = await db.collection(COLLECTION_NAME).findOne({ guildId })
    if (existing) {
      // Update existing entry
      await db.collection(COLLECTION_NAME).updateOne(
        { guildId },
        {
          $set: {
            roleIds,
            roleNames,
            guildName,
            guildIcon,
            updatedAt: new Date().toISOString(),
            updatedBy: userId,
          },
        }
      )
      return NextResponse.json({ success: true, message: "Beta authorization updated", guildName })
    }

    // Insert new
    await db.collection(COLLECTION_NAME).insertOne({
      guildId,
      guildName,
      guildIcon,
      roleIds,
      roleNames,
      addedBy: userId,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message: "Beta authorization added", guildName })
  } catch (error) {
    console.error("Failed to add beta authorization:", error)
    return NextResponse.json({ success: false, error: "Failed to add" }, { status: 500 })
  }
}

// DELETE - Remove a beta authorized guild
export async function DELETE(request: Request) {
  const { authorized } = await verifyAdmin()
  if (!authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get("guildId")

    if (!guildId) {
      return NextResponse.json({ success: false, error: "Guild ID is required" }, { status: 400 })
    }

    const db = await getBotDatabase("syruprx")
    if (!db) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 })
    }

    await db.collection(COLLECTION_NAME).deleteOne({ guildId })

    return NextResponse.json({ success: true, message: "Beta authorization removed" })
  } catch (error) {
    console.error("Failed to remove beta authorization:", error)
    return NextResponse.json({ success: false, error: "Failed to remove" }, { status: 500 })
  }
}
