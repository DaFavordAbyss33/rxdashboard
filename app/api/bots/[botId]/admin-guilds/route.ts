import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"

export const dynamic = "force-dynamic"

// Helper to fetch user's guild IDs using their access token
async function fetchUserGuildIds(accessToken: string): Promise<string[]> {
  try {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (response.ok) {
      const guilds = await response.json()
      return guilds.map((g: { id: string }) => g.id)
    }
  } catch (err) {
    console.error("Failed to fetch user guilds:", err)
  }
  return []
}

// Helper to fetch user's roles in a specific guild using their access token
async function fetchMemberRoles(accessToken: string, guildId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    if (response.ok) {
      const member = await response.json()
      return member.roles || []
    }
  } catch (err) {
    console.error(`Failed to fetch member roles for guild ${guildId}:`, err)
  }
  return []
}

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
    const accessToken = session.accessToken

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not found in session", adminGuildIds: [] },
        { status: 401 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "No access token in session", adminGuildIds: [] },
        { status: 401 }
      )
    }

    // Fetch user's guild IDs from Discord API (not stored in session to avoid 4KB cookie limit)
    const userGuildIds = await fetchUserGuildIds(accessToken)

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
      // Get all guild configs (for all guilds list)
      const allGuildConfigs = await db.collection("mapleguildconfigs")
        .find({})
        .toArray()
      
      const allGuildIds = allGuildConfigs.map(config => config.guildId)
      
      // Find guild configs where user is in the guild AND has admin roles configured
      const userGuildConfigs = allGuildConfigs.filter(config => 
        userGuildIds.includes(config.guildId) && 
        config.adminRoleIds && 
        config.adminRoleIds.length > 0
      )
      
      // Fetch roles dynamically and check which guilds user has admin role in
      const adminRoleGuildIds: string[] = []
      for (const configDoc of userGuildConfigs) {
        const adminRoleIds = configDoc.adminRoleIds || []
        const userRoles = await fetchMemberRoles(accessToken, configDoc.guildId)
        
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

    // Find all guild configs for guilds the user is in that have admin roles configured
    const guildConfigs = await db.collection("mapleguildconfigs")
      .find({
        guildId: { $in: userGuildIds },
        adminRoleIds: { $exists: true, $ne: [] }
      })
      .toArray()

    // For each guild with admin roles, fetch user's current roles and check access
    const adminGuildIds: string[] = []
    
    // Fetch all roles in parallel for better performance
    const roleChecks = await Promise.all(
      guildConfigs.map(async (configDoc) => {
        const adminRoleIds = configDoc.adminRoleIds || []
        const userRoles = await fetchMemberRoles(accessToken, configDoc.guildId)
        const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
        return { guildId: configDoc.guildId, hasAdminRole }
      })
    )
    
    for (const check of roleChecks) {
      if (check.hasAdminRole) {
        adminGuildIds.push(check.guildId)
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
