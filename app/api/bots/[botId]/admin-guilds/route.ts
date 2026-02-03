import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase, type BotId } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"
import { BOT_TOKENS } from "@/lib/discord"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"

// Fetch user's roles in a guild using the BOT token (not user's OAuth token)
// This works because the bot is in the guild and can access member data
async function fetchMemberRolesWithBot(botToken: string, guildId: string, userId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    )
    if (response.ok) {
      const member = await response.json()
      return member.roles || []
    } else {
      const errorText = await response.text()
      console.log(`[v0] fetchMemberRolesWithBot: Error for guild ${guildId} user ${userId} - ${response.status}: ${errorText.substring(0, 100)}`)
    }
  } catch (err) {
    console.error(`[v0] fetchMemberRolesWithBot: Exception for guild ${guildId}:`, err)
  }
  return []
}

// GET /api/bots/[botId]/admin-guilds - Get guilds where user has admin role
// Uses the bot token to fetch member roles (more reliable than OAuth)
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

    // Get the bot token to fetch member roles
    const botToken = BOT_TOKENS[botId as keyof typeof BOT_TOKENS]
    
    if (!botToken) {
      console.log("[v0] admin-guilds: No bot token for", botId)
      return NextResponse.json({
        success: true,
        adminGuildIds: [],
        guildAdminRoles,
        allGuildIds,
        isMaster: isMasterUser(userId),
      })
    }

    // For guilds that have admin roles configured, check if user has those roles
    // Using the bot token to fetch member data (more reliable than user OAuth)
    const adminGuildIds: string[] = []
    const guildIdsToCheck = Object.keys(guildAdminRoles)
    
    console.log("[v0] admin-guilds: Checking", guildIdsToCheck.length, "guilds for user", userId)
    
    // Check roles in parallel (but limit concurrency to avoid rate limits)
    const BATCH_SIZE = 10
    for (let i = 0; i < guildIdsToCheck.length; i += BATCH_SIZE) {
      const batch = guildIdsToCheck.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(
        batch.map(async (guildId) => {
          const adminRoleIds = guildAdminRoles[guildId]
          const userRoles = await fetchMemberRolesWithBot(botToken, guildId, userId)
          const hasAdminRole = adminRoleIds.some((roleId: string) => userRoles.includes(roleId))
          
          console.log("[v0] admin-guilds: Guild", guildId, "- userRoles:", userRoles.length, "adminRoles:", adminRoleIds.length, "hasAdmin:", hasAdminRole)
          
          return { guildId, hasAdminRole }
        })
      )
      
      for (const result of results) {
        if (result.hasAdminRole) {
          adminGuildIds.push(result.guildId)
        }
      }
    }
    
    console.log("[v0] admin-guilds: Final adminGuildIds:", adminGuildIds)

    return NextResponse.json({
      success: true,
      adminGuildIds, // Guilds where user has admin role (server-side matched)
      guildAdminRoles, // Also include for debugging/client use
      allGuildIds,
      isMaster: isMasterUser(userId),
    })
  } catch (error) {
    console.error("Failed to fetch admin guilds:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin guilds", adminGuildIds: [], guildAdminRoles: {}, allGuildIds: [] },
      { status: 500 }
    )
  }
}
