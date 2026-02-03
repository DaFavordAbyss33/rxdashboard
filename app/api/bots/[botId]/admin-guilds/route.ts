import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"

export const dynamic = "force-dynamic"

// Helper to fetch user's roles in a specific guild using their access token
async function fetchMemberRoles(accessToken: string, guildId: string): Promise<string[]> {
  try {
    console.log("[v0] fetchMemberRoles: Fetching roles for guild", guildId)
    const response = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    console.log("[v0] fetchMemberRoles: Discord API response status:", response.status)
    if (response.ok) {
      const member = await response.json()
      console.log("[v0] fetchMemberRoles: Guild", guildId, "- user has", member.roles?.length || 0, "roles:", member.roles?.slice(0, 5))
      return member.roles || []
    } else {
      const errorText = await response.text()
      console.log("[v0] fetchMemberRoles: Discord API error for guild", guildId, "-", response.status, errorText.substring(0, 200))
    }
  } catch (err) {
    console.error(`[v0] fetchMemberRoles: Failed to fetch member roles for guild ${guildId}:`, err)
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
    
    // Log all available cookies for debugging
    const allCookies = cookieStore.getAll()
    console.log("[v0] admin-guilds API called for bot:", botId, "- all cookies:", allCookies.map(c => c.name).join(", ") || "(none)")
    
    const sessionCookie = cookieStore.get("discord_session")
    console.log("[v0] admin-guilds: discord_session cookie exists:", !!sessionCookie, "value length:", sessionCookie?.value?.length || 0)

    if (!sessionCookie) {
      console.log("[v0] admin-guilds: No session cookie found, returning 401")
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
    // Support both old format (guilds array) and new format (guildIds array)
    const userGuildIds: string[] = session.guildIds || (session.guilds?.map((g: { id: string }) => g.id) || [])
    const accessToken = session.accessToken

    console.log("[v0] admin-guilds: userId:", userId, "guildIds count:", userGuildIds.length, "hasAccessToken:", !!accessToken)

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

    // Connect to MongoDB for this bot
    const db = await getBotDatabase(botId as BotId)
    
    if (!db) {
      // No database configured for this bot - return empty list
      console.log("[v0] admin-guilds: No database for bot", botId)
      return NextResponse.json({
        success: true,
        adminGuildIds: [],
        isMaster: isMasterUser(userId),
      })
    }

    // Master user: return both permissioned guilds AND all guilds separately
    if (isMasterUser(userId)) {
      console.log("[v0] admin-guilds: Master user detected")
      // Get all guild configs (for all guilds list)
      const allGuildConfigs = await db.collection("mapleguildconfigs")
        .find({})
        .toArray()
      
      const allGuildIds = allGuildConfigs.map(config => config.guildId)
      console.log("[v0] admin-guilds: Found", allGuildConfigs.length, "total guild configs")
      
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
    console.log("[v0] admin-guilds: Searching for guild configs with userGuildIds:", userGuildIds.slice(0, 5), "... (", userGuildIds.length, "total)")
    const guildConfigs = await db.collection("mapleguildconfigs")
      .find({
        guildId: { $in: userGuildIds },
        adminRoleIds: { $exists: true, $ne: [] }
      })
      .toArray()

    console.log("[v0] admin-guilds: Found", guildConfigs.length, "guild configs with admin roles for user's guilds")
    guildConfigs.forEach(c => console.log("[v0] admin-guilds: Config for guild", c.guildId, "adminRoleIds:", c.adminRoleIds))

    // For each guild with admin roles, fetch user's current roles and check access
    const adminGuildIds: string[] = []
    
    // Fetch all roles in parallel for better performance
    const roleChecks = await Promise.all(
      guildConfigs.map(async (configDoc) => {
        const adminRoleIds = configDoc.adminRoleIds || []
        const userRoles = await fetchMemberRoles(accessToken, configDoc.guildId)
        const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
        console.log("[v0] admin-guilds: Guild", configDoc.guildId, "- userRoles:", userRoles.slice(0, 5), "adminRoleIds:", adminRoleIds, "hasAdminRole:", hasAdminRole)
        return { guildId: configDoc.guildId, hasAdminRole }
      })
    )
    
    for (const check of roleChecks) {
      if (check.hasAdminRole) {
        adminGuildIds.push(check.guildId)
      }
    }
    
    console.log("[v0] admin-guilds: Final result - adminGuildIds:", adminGuildIds)

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
