import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// GET /api/auth/guilds - Fetch user's guilds from Discord using stored access token
export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")

  if (!sessionCookie) {
    return NextResponse.json({
      success: false,
      error: "Not authenticated",
      guilds: [],
    }, { status: 401 })
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const accessToken = session.accessToken

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "No access token",
        guilds: [],
      }, { status: 401 })
    }

    // Fetch user's guilds from Discord API
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Discord API error fetching guilds:", response.status, errorText)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch guilds from Discord",
        guilds: [],
      }, { status: response.status })
    }

    const discordGuilds = await response.json()

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

    return NextResponse.json({
      success: true,
      guilds,
    })
  } catch (error) {
    console.error("Error fetching user guilds:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch guilds",
      guilds: [],
    }, { status: 500 })
  }
}
