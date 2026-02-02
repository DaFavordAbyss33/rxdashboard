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

    return NextResponse.json({
      user: session.user,
      guilds: session.guilds,
      isAdmin: session.isAdmin,
      isAuthenticated: true,
    })
  } catch (error) {
    console.error("Session parse error:", error)
    return NextResponse.json({ user: null, isAuthenticated: false })
  }
}
