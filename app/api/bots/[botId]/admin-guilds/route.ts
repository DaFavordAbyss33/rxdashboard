import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// GET /api/bots/[botId]/admin-guilds - Get guilds where user has admin role for this bot
export async function GET(
  request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("discord_session")

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Not authenticated", adminGuildIds: [] },
        { status: 401 }
      )
    }

    let session
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid session", adminGuildIds: [] },
        { status: 401 }
      )
    }

    const userId = session.user?.id
    const userGuilds = session.guilds || []

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not found in session", adminGuildIds: [] },
        { status: 401 }
      )
    }

    // Get user's guild IDs from the session
    const userGuildIds = userGuilds.map((g: { id: string }) => g.id)

    // Connect to MongoDB and find guilds where user has admin roles
    const client = await clientPromise
    const db = client.db()
    
    // Find all guild configs for this bot where the user might have an admin role
    const guildConfigs = await db.collection("guildConfigs")
      .find({
        botId,
        guildId: { $in: userGuildIds }
      })
      .toArray()

    // For each guild, check if user has one of the admin roles
    const adminGuildIds: string[] = []
    
    for (const config of guildConfigs) {
      const adminRoleIds = config.config?.adminRoleIds || []
      if (adminRoleIds.length === 0) continue

      // Get user's roles in this guild from session
      const guildData = userGuilds.find((g: { id: string }) => g.id === config.guildId)
      const userRoles = guildData?.memberRoles || []

      // Check if user has any of the admin roles
      const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
      if (hasAdminRole) {
        adminGuildIds.push(config.guildId)
      }
    }

    // Return the list of guild IDs where user has admin role access
    return NextResponse.json({
      success: true,
      adminGuildIds,
    })
  } catch (error) {
    console.error("Failed to fetch admin guilds:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin guilds", adminGuildIds: [] },
      { status: 500 }
    )
  }
}
