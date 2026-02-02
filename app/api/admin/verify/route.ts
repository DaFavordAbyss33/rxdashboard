import { NextResponse } from "next/server"
import { ADMIN_CONFIG } from "@/lib/admin"

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ isAdmin: false, error: "No access token provided" }, { status: 400 })
    }

    // Get user's guild member info for the admin guild
    const response = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${ADMIN_CONFIG.guildId}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ isAdmin: false, reason: "User not in admin guild" })
      }
      return NextResponse.json({ isAdmin: false, reason: "Failed to verify" })
    }

    const memberData = await response.json()
    const isAdmin = memberData.roles?.includes(ADMIN_CONFIG.roleId) ?? false

    return NextResponse.json({ 
      isAdmin,
      guildId: ADMIN_CONFIG.guildId,
      roleId: ADMIN_CONFIG.roleId,
    })
  } catch (error) {
    console.error("Admin verification error:", error)
    return NextResponse.json({ isAdmin: false, error: "Verification failed" }, { status: 500 })
  }
}
