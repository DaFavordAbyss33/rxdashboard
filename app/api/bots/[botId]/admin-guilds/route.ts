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
    } else {
      // Log the error response from Discord
      const errorText = await response.text()
      console.error(`[v0] fetchMemberRoles: Discord API error for guild ${guildId} - Status: ${response.status}, Error: ${errorText}`)
    }
  } catch (err) {
    console.error(`[v0] fetchMemberRoles: Exception for guild ${guildId}:`, err)
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
    console.log("[v0] admin-guilds: User", userId, "is in", userGuildIds.length, "guilds")

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
      // Get all guild configs from both collections
      const dashboardConfigs = await db.collection("configs").find({}).toArray()
      const botGuildConfigs = await db.collection("guilds").find({}).toArray()
      
      // Collect all guild IDs from both sources
      const allGuildIdsSet = new Set<string>()
      dashboardConfigs.forEach(c => c.guildId && allGuildIdsSet.add(c.guildId))
      botGuildConfigs.forEach(c => {
        const gId = c.guildId || c._id?.toString()
        if (gId) allGuildIdsSet.add(gId)
      })
      const allGuildIds = Array.from(allGuildIdsSet)
      
      // Build admin roles map for guilds user is in
      const guildAdminRolesMap = new Map<string, string[]>()
      
      // From dashboard configs
      for (const config of dashboardConfigs) {
        if (!userGuildIds.includes(config.guildId)) continue
        const adminRoles = config.config?.adminRoleIds || []
        if (adminRoles.length > 0) {
          guildAdminRolesMap.set(config.guildId, adminRoles)
        }
      }
      
      // From bot configs
      for (const config of botGuildConfigs) {
        const guildId = config.guildId || config._id?.toString()
        if (!guildId || !userGuildIds.includes(guildId)) continue
        
        const adminRoles: string[] = []
        if (config.adminRole) adminRoles.push(config.adminRole)
        if (config.adminRoleId) adminRoles.push(config.adminRoleId)
        if (Array.isArray(config.adminRoleIds)) adminRoles.push(...config.adminRoleIds)
        
        if (adminRoles.length > 0) {
          const existing = guildAdminRolesMap.get(guildId) || []
          guildAdminRolesMap.set(guildId, [...new Set([...existing, ...adminRoles])])
        }
      }
      
      // Check which guilds user has admin role in
      const adminRoleGuildIds: string[] = []
      for (const [guildId, adminRoleIds] of guildAdminRolesMap) {
        const userRoles = await fetchMemberRoles(accessToken, guildId)
        const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
        if (hasAdminRole) {
          adminRoleGuildIds.push(guildId)
        }
      }
      
      return NextResponse.json({
        success: true,
        adminGuildIds: adminRoleGuildIds,
        allGuildIds,
        isMaster: true,
      })
    }

    // Check BOTH collections:
    // 1. "configs" collection - used by dashboard (adminRoleIds inside config object)
    // 2. "guilds" collection - used by bot setup (adminRole or adminRoleIds at root level)
    
    // Get configs from dashboard-style collection
    const dashboardConfigs = await db.collection("configs")
      .find({
        guildId: { $in: userGuildIds },
        "config.adminRoleIds": { $exists: true, $ne: [] }
      })
      .toArray()
    
    // Get configs from bot-style collection (guilds collection)
    // Bot might store as adminRole (string) or adminRoleIds (array) or adminRoleId (string)
    const botConfigs = await db.collection("guilds")
      .find({
        $or: [
          { guildId: { $in: userGuildIds }, adminRole: { $exists: true, $ne: null } },
          { guildId: { $in: userGuildIds }, adminRoleId: { $exists: true, $ne: null } },
          { guildId: { $in: userGuildIds }, adminRoleIds: { $exists: true, $ne: [] } },
          { _id: { $in: userGuildIds }, adminRole: { $exists: true, $ne: null } },
          { _id: { $in: userGuildIds }, adminRoleId: { $exists: true, $ne: null } },
          { _id: { $in: userGuildIds }, adminRoleIds: { $exists: true, $ne: [] } },
        ]
      })
      .toArray()
    
    console.log("[v0] admin-guilds: Found", dashboardConfigs.length, "dashboard configs,", botConfigs.length, "bot configs")
    
    // Log what we found for debugging
    dashboardConfigs.forEach(c => {
      console.log("[v0] admin-guilds: Dashboard config for guild", c.guildId, "- adminRoleIds:", c.config?.adminRoleIds)
    })
    botConfigs.forEach(c => {
      const gId = c.guildId || c._id
      console.log("[v0] admin-guilds: Bot config for guild", gId, "- adminRole:", c.adminRole, "adminRoleId:", c.adminRoleId, "adminRoleIds:", c.adminRoleIds)
    })

    // Build a map of guildId -> adminRoleIds (combining both sources)
    const guildAdminRolesMap = new Map<string, string[]>()
    
    // Add dashboard configs
    for (const config of dashboardConfigs) {
      const adminRoles = config.config?.adminRoleIds || []
      if (adminRoles.length > 0) {
        guildAdminRolesMap.set(config.guildId, adminRoles)
      }
    }
    
    // Add bot configs (might override or add to dashboard configs)
    for (const config of botConfigs) {
      const guildId = config.guildId || config._id?.toString()
      if (!guildId) continue
      
      // Collect all possible admin role fields
      const adminRoles: string[] = []
      if (config.adminRole) adminRoles.push(config.adminRole)
      if (config.adminRoleId) adminRoles.push(config.adminRoleId)
      if (Array.isArray(config.adminRoleIds)) adminRoles.push(...config.adminRoleIds)
      
      if (adminRoles.length > 0) {
        // Merge with existing if any
        const existing = guildAdminRolesMap.get(guildId) || []
        guildAdminRolesMap.set(guildId, [...new Set([...existing, ...adminRoles])])
      }
    }
    
    console.log("[v0] admin-guilds: Combined guild admin roles map has", guildAdminRolesMap.size, "guilds")

    // For each guild with admin roles, fetch user's current roles and check access
    const adminGuildIds: string[] = []
    
    // Fetch all roles in parallel for better performance
    const roleChecks = await Promise.all(
      Array.from(guildAdminRolesMap.entries()).map(async ([guildId, adminRoleIds]) => {
        const userRoles = await fetchMemberRoles(accessToken, guildId)
        const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
        console.log("[v0] admin-guilds: Guild", guildId, "- user roles:", userRoles.join(","), "| admin roles:", adminRoleIds.join(","), "| hasAdminRole:", hasAdminRole)
        return { guildId, hasAdminRole }
      })
    )
    
    for (const check of roleChecks) {
      if (check.hasAdminRole) {
        adminGuildIds.push(check.guildId)
      }
    }

    console.log("[v0] admin-guilds: Final adminGuildIds:", adminGuildIds)

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
