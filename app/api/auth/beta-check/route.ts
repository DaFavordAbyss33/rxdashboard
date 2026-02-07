import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBotDatabase } from "@/lib/mongodb"
import { isMasterUser } from "@/lib/admin"
import { BOT_TOKENS } from "@/lib/discord"

export const dynamic = "force-dynamic"

const DISCORD_API_BASE = "https://discord.com/api/v10"
const COLLECTION_NAME = "beta_authorizations"

// Check if a user has beta access
// Master users and admins always have access
// Other users must be in an authorized guild AND have an authorized role
export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")

  if (!sessionCookie) {
    return NextResponse.json({ success: false, hasBetaAccess: false, reason: "Not authenticated" })
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const userId = session.user?.id

    if (!userId) {
      return NextResponse.json({ success: false, hasBetaAccess: false, reason: "No user ID" })
    }

    // Master users and admins always have beta access
    if (isMasterUser(userId) || session.isAdmin === true) {
      return NextResponse.json({
        success: true,
        hasBetaAccess: true,
        reason: "admin",
      })
    }

    const db = await getBotDatabase("syruprx")
    if (!db) {
      return NextResponse.json({ success: false, hasBetaAccess: false, reason: "Database unavailable" })
    }

    // Get all beta authorized guilds
    const authorizations = await db.collection(COLLECTION_NAME).find({}).toArray()

    if (authorizations.length === 0) {
      // No beta restrictions configured - allow all
      return NextResponse.json({
        success: true,
        hasBetaAccess: true,
        reason: "no_restrictions",
      })
    }

    // Get the bot token to check member roles
    const botToken = BOT_TOKENS.syruprx
    if (!botToken) {
      return NextResponse.json({ success: false, hasBetaAccess: false, reason: "Bot token unavailable" })
    }

    // Check each authorized guild to see if the user is in it and has the required roles
    for (const auth of authorizations) {
      try {
        const memberResponse = await fetch(
          `${DISCORD_API_BASE}/guilds/${auth.guildId}/members/${userId}`,
          { headers: { Authorization: `Bot ${botToken}` } }
        )

        if (!memberResponse.ok) {
          // User is not in this guild, try next
          continue
        }

        const member = await memberResponse.json()
        const userRoles: string[] = member.roles || []

        // Check if user has any of the authorized roles for this guild
        const hasAuthorizedRole = (auth.roleIds || []).some(
          (roleId: string) => userRoles.includes(roleId)
        )

        if (hasAuthorizedRole) {
          return NextResponse.json({
            success: true,
            hasBetaAccess: true,
            reason: "authorized",
            guildId: auth.guildId,
            guildName: auth.guildName,
          })
        }
      } catch (err) {
        console.error(`Beta check error for guild ${auth.guildId}:`, err)
        continue
      }
    }

    // User is not in any authorized guild with the required roles
    return NextResponse.json({
      success: true,
      hasBetaAccess: false,
      reason: "not_authorized",
    })
  } catch (error) {
    console.error("Beta access check failed:", error)
    return NextResponse.json({ success: false, hasBetaAccess: false, reason: "error" })
  }
}
