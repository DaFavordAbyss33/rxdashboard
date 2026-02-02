import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")

  if (!sessionCookie) {
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
      console.log("Clearing invalid/mock session data")
      cookieStore.delete("discord_session")
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    // Validate username isn't mock
    if (session.user?.username === "BotAdmin") {
      console.log("Clearing mock BotAdmin session")
      cookieStore.delete("discord_session")
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    return NextResponse.json({
      user: session.user,
      guilds: session.guilds,
      isAdmin: session.isAdmin,
      isAuthenticated: true,
    })
  } catch (error) {
    console.error("Session parse error:", error)
    cookieStore.delete("discord_session")
    return NextResponse.json({ user: null, isAuthenticated: false })
  }
}
