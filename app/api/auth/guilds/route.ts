import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// GET /api/auth/guilds - Fetch user's guilds from Discord using stored access token
export async function GET() {
  console.log("[v0] Guilds API - Starting request")
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")

  console.log("[v0] Guilds API - cookie exists:", !!sessionCookie)

  if (!sessionCookie) {
    console.log("[v0] Guilds API - No cookie, returning 401")
    return NextResponse.json({
      success: false,
      error: "Not authenticated",
      guilds: [],
    }, { status: 401 })
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const accessToken = session.accessToken

    console.log("[v0] Guilds API - User:", session.user?.username, "hasAccessToken:", !!accessToken)

    if (!accessToken) {
      console.log("[v0] Guilds API - No access token")
      return NextResponse.json({
        success: false,
        error: "No access token",
        guilds: [],
      }, { status: 401 })
    }

    // Fetch user's guilds from Discord API
    console.log("[v0] Guilds API - Fetching guilds from Discord...")
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.log("[v0] Guilds API - Discord response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Guilds API - Discord error:", response.status, errorText)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch guilds from Discord",
        guilds: [],
      }, { status: response.status })
    }

    const discordGuilds = await response.json()
    console.log("[v0] Guilds API - Fetched", discordGuilds.length, "guilds from Discord")

    // Map to our format with memberRoles populated from member endpoint where possible
    const guilds = await Promise.all(
      discordGuilds.map(async (guild: {
        id: string
        name: string
        icon: string | null
        owner: boolean
        permissions: string
      }) => {
        // Try to fetch member roles for this guild
        let memberRoles: string[] = []
        try {
          const memberResponse = await fetch(
            `https://discord.com/api/users/@me/guilds/${guild.id}/member`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          )
          if (memberResponse.ok) {
            const member = await memberResponse.json()
            memberRoles = member.roles || []
          }
        } catch {
          // Ignore errors - some guilds may not allow member fetching
        }

        return {
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
          permissions: guild.permissions,
          memberRoles,
        }
      })
    )

    console.log("[v0] Guilds API - Returning", guilds.length, "guilds with roles")
    return NextResponse.json({
      success: true,
      guilds,
    })
  } catch (error) {
    console.error("[v0] Guilds API - Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch guilds",
      guilds: [],
    }, { status: 500 })
  }
}
