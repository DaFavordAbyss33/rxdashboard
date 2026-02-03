import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"

export const dynamic = "force-dynamic"

// GET /api/bots/[botId]/admin-guilds - Get admin role configs for this bot
// Returns a map of guildId -> adminRoleIds so the client can do role matching
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
        { success: false, error: "Not authenticated", guildAdminRoles: {}, allGuildIds: [] },
        { status: 401 }
      )
    }

    let session
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid session", guildAdminRoles: {}, allGuildIds: [] },
        { status: 401 }
      )
    }

    const userId = session.user?.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not found in session", guildAdminRoles: {}, allGuildIds: [] },
        { status: 401 }
      )
    }

    // Connect to MongoDB for this bot
    const db = await getBotDatabase(botId as BotId)
    
    if (!db) {
      // No database configured for this bot
      return NextResponse.json({
        success: true,
        guildAdminRoles: {},
        allGuildIds: [],
        isMaster: isMasterUser(userId),
      })
    }

    // Get all guild configs from all three collections
    const mapleGuildConfigs = await db.collection("mapleguildconfigs").find({}).toArray()
    const dashboardConfigs = await db.collection("configs").find({}).toArray()
    const botGuildConfigs = await db.collection("guilds").find({}).toArray()
    
    // Collect all guild IDs (for master users to see all installed guilds)
    const allGuildIdsSet = new Set<string>()
    mapleGuildConfigs.forEach(c => c.guildId && allGuildIdsSet.add(c.guildId))
    dashboardConfigs.forEach(c => c.guildId && allGuildIdsSet.add(c.guildId))
    botGuildConfigs.forEach(c => c.guildId && allGuildIdsSet.add(c.guildId))
    const allGuildIds = Array.from(allGuildIdsSet)
    
    // Build a map of guildId -> adminRoleIds (combining all sources)
    const guildAdminRoles: Record<string, string[]> = {}
    
    // From mapleguildconfigs (adminRoleIds at root level)
    for (const config of mapleGuildConfigs) {
      if (!config.guildId) continue
      const adminRoles = config.adminRoleIds || []
      if (adminRoles.length > 0) {
        guildAdminRoles[config.guildId] = adminRoles
      }
    }
    
    // From dashboard configs (adminRoleIds inside config object)
    for (const config of dashboardConfigs) {
      if (!config.guildId) continue
      const adminRoles = config.config?.adminRoleIds || []
      if (adminRoles.length > 0) {
        const existing = guildAdminRoles[config.guildId] || []
        guildAdminRoles[config.guildId] = [...new Set([...existing, ...adminRoles])]
      }
    }
    
    // From guilds configs (various field names)
    for (const config of botGuildConfigs) {
      if (!config.guildId) continue
      
      const adminRoles: string[] = []
      if (config.adminRole) adminRoles.push(config.adminRole)
      if (config.adminRoleId) adminRoles.push(config.adminRoleId)
      if (Array.isArray(config.adminRoleIds)) adminRoles.push(...config.adminRoleIds)
      
      if (adminRoles.length > 0) {
        const existing = guildAdminRoles[config.guildId] || []
        guildAdminRoles[config.guildId] = [...new Set([...existing, ...adminRoles])]
      }
    }

    return NextResponse.json({
      success: true,
      guildAdminRoles, // Map of guildId -> adminRoleIds for client-side matching
      allGuildIds, // All guilds with configs (for master users)
      isMaster: isMasterUser(userId),
    })
  } catch (error) {
    console.error("Failed to fetch admin guilds:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin guilds", guildAdminRoles: {}, allGuildIds: [] },
      { status: 500 }
    )
  }
}
