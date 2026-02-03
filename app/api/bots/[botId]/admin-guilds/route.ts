import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"

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

    // Connect to MongoDB for this bot
    const db = await getBotDatabase(botId as BotId)
    
    if (!db) {
      // No database configured for this bot - return empty list
      return NextResponse.json({
        success: true,
        adminGuildIds: [],
        isMaster: isMasterUser(userId),
      })
    }

    // Master user gets access to ALL guilds where the bot is installed
    if (isMasterUser(userId)) {
      // Use "mapleguildconfigs" collection - Mongoose model name MapleGuildConfig becomes mapleguildconfigs
      const allGuildConfigs = await db.collection("mapleguildconfigs")
        .find({})
        .toArray()
      
      const allGuildIds = allGuildConfigs.map(config => config.guildId)
      
      return NextResponse.json({
        success: true,
        adminGuildIds: allGuildIds,
        isMaster: true,
      })
    }

    // Get user's guild IDs from the session
    const userGuildIds = userGuilds.map((g: { id: string }) => g.id)
    
    // Find all guild configs for guilds the user is in
    // Collection name: mapleguildconfigs (Mongoose pluralizes and lowercases MapleGuildConfig)
    const guildConfigs = await db.collection("mapleguildconfigs")
      .find({
        guildId: { $in: userGuildIds }
      })
      .toArray()

    // For each guild, check if user has one of the admin roles
    const adminGuildIds: string[] = []
    
    for (const configDoc of guildConfigs) {
      // adminRoleIds is stored DIRECTLY on the document (not nested in config)
      const adminRoleIds = configDoc.adminRoleIds || []
      
      // Get user's roles in this guild from session
      const guildData = userGuilds.find((g: { id: string; memberRoles?: string[] }) => g.id === configDoc.guildId)
      const userRoles = guildData?.memberRoles || []

      if (adminRoleIds.length === 0) continue

      // Check if user has any of the admin roles
      const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
      
      if (hasAdminRole) {
        adminGuildIds.push(configDoc.guildId)
      }
    }

    // Return the list of guild IDs where user has admin role access
    return NextResponse.json({
      success: true,
      adminGuildIds,
      isMaster: false,
    })
  } catch (error) {
    console.error("Failed to fetch admin guilds:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin guilds", adminGuildIds: [] },
      { status: 500 }
    )
  }
}
