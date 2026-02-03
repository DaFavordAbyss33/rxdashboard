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

    console.log("[v0] admin-guilds: userId:", userId, "userGuilds count:", userGuilds.length)
    
    // Log guilds with their memberRoles for debugging
    const guildsWithRoles = userGuilds.filter((g: { id: string; memberRoles?: string[] }) => g.memberRoles && g.memberRoles.length > 0)
    console.log("[v0] admin-guilds: guilds with roles:", guildsWithRoles.length, "guilds:", guildsWithRoles.map((g: { id: string; name: string; memberRoles?: string[] }) => ({ id: g.id, name: g.name, rolesCount: g.memberRoles?.length || 0 })))

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

    // Master user: return both permissioned guilds AND all guilds separately
    if (isMasterUser(userId)) {
      // Get user's guild IDs from the session
      const userGuildIds = userGuilds.map((g: { id: string }) => g.id)
      
      // Get all guild configs (for all guilds list)
      const allGuildConfigs = await db.collection("mapleguildconfigs")
        .find({})
        .toArray()
      
      const allGuildIds = allGuildConfigs.map(config => config.guildId)
      
      // Find guild configs where user is in the guild (to check admin roles)
      const userGuildConfigs = allGuildConfigs.filter(config => 
        userGuildIds.includes(config.guildId)
      )
      
      // Check which guilds user has admin role in
      const adminRoleGuildIds: string[] = []
      for (const configDoc of userGuildConfigs) {
        const adminRoleIds = configDoc.adminRoleIds || []
        if (adminRoleIds.length === 0) continue
        
        const guildData = userGuilds.find((g: { id: string; memberRoles?: string[] }) => g.id === configDoc.guildId)
        const userRoles = guildData?.memberRoles || []
        
        const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
        if (hasAdminRole) {
          adminRoleGuildIds.push(configDoc.guildId)
        }
      }
      
      return NextResponse.json({
        success: true,
        adminGuildIds: adminRoleGuildIds, // Guilds where master has admin role
        allGuildIds, // All installed guilds (for "Show all" feature)
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

    console.log("[v0] admin-guilds: found", guildConfigs.length, "guild configs for user's guilds")

    // For each guild, check if user has one of the admin roles
    const adminGuildIds: string[] = []
    
    for (const configDoc of guildConfigs) {
      // adminRoleIds is stored DIRECTLY on the document (not nested in config)
      const adminRoleIds = configDoc.adminRoleIds || []
      
      // Get user's roles in this guild from session
      const guildData = userGuilds.find((g: { id: string; memberRoles?: string[] }) => g.id === configDoc.guildId)
      const userRoles = guildData?.memberRoles || []

      console.log("[v0] admin-guilds: checking guild", configDoc.guildId, "adminRoleIds:", adminRoleIds, "userRoles:", userRoles)

      if (adminRoleIds.length === 0) {
        console.log("[v0] admin-guilds: no admin roles configured for guild", configDoc.guildId)
        continue
      }

      // Check if user has any of the admin roles
      const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
      console.log("[v0] admin-guilds: hasAdminRole:", hasAdminRole, "for guild", configDoc.guildId)
      
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
