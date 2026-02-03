import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")

  console.log("[v0] Session API - cookie exists:", !!sessionCookie, "length:", sessionCookie?.value?.length || 0)

  if (!sessionCookie) {
    console.log("[v0] Session API - No cookie, returning unauthenticated")
    return NextResponse.json({ user: null, isAuthenticated: false })
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    
    // Check if session has expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      // Token expired, clear session
      cookieStore.delete("discord_session")
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    // Validate that this is a real Discord session, not mock data
    // Real Discord user IDs are 17-19 digit snowflakes
    const userId = session.user?.id
    if (!userId || userId.length < 17 || userId === "123456789012345678") {
      // This looks like mock data, clear it
      cookieStore.delete("discord_session")
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    // Validate username isn't mock
    if (session.user?.username === "BotAdmin") {
      cookieStore.delete("discord_session")
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    console.log("[v0] Session API - Valid session for user:", session.user?.username, "id:", session.user?.id)
    return NextResponse.json({
      user: session.user,
      // guildIds no longer stored in session to avoid 4KB cookie limit
      // Fetch guilds dynamically via /api/bots/[botId]/admin-guilds instead
      isAdmin: session.isAdmin,
      isAuthenticated: true,
    })
  } catch (err) {
    console.log("[v0] Session API - Parse error:", err)
    cookieStore.delete("discord_session")
    return NextResponse.json({ user: null, isAuthenticated: false })
  }
}

// DELETE endpoint to force clear session
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("discord_session")
  return NextResponse.json({ success: true, message: "Session cleared" })
}
