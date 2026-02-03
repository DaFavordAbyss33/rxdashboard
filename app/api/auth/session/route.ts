import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("discord_session")
  
  // Log all available cookies for debugging
  const allCookies = cookieStore.getAll()
  console.log("[v0] Session API called - all cookies:", allCookies.map(c => c.name).join(", ") || "(none)")
  console.log("[v0] Session API called, discord_session cookie exists:", !!sessionCookie, "value length:", sessionCookie?.value?.length || 0)

  if (!sessionCookie) {
    return NextResponse.json({ user: null, isAuthenticated: false })
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    
    console.log("[v0] Session data:", {
      userId: session.user?.id,
      username: session.user?.username,
      hasGuildIds: !!session.guildIds,
      guildIdsCount: session.guildIds?.length || session.guilds?.length || 0,
    })
    
    // Check if session has expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      // Token expired, clear session
      console.log("[v0] Session expired, clearing")
      cookieStore.delete("discord_session")
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    // Validate that this is a real Discord session, not mock data
    // Real Discord user IDs are 17-19 digit snowflakes
    const userId = session.user?.id
    if (!userId || userId.length < 17 || userId === "123456789012345678") {
      // This looks like mock data, clear it
      console.log("[v0] Clearing invalid/mock session data - userId:", userId)
      cookieStore.delete("discord_session")
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    // Validate username isn't mock
    if (session.user?.username === "BotAdmin") {
      console.log("[v0] Clearing mock BotAdmin session")
      cookieStore.delete("discord_session")
      return NextResponse.json({ user: null, isAuthenticated: false })
    }

    console.log("[v0] Valid session found for:", session.user?.username)

    return NextResponse.json({
      user: session.user,
      // Support both old format (guilds array) and new format (guildIds array)
      guildIds: session.guildIds || (session.guilds?.map((g: { id: string }) => g.id) || []),
      guilds: session.guilds, // Keep for backwards compatibility
      isAdmin: session.isAdmin,
      isAuthenticated: true,
    })
  } catch (error) {
    console.error("[v0] Session parse error:", error)
    cookieStore.delete("discord_session")
    return NextResponse.json({ user: null, isAuthenticated: false })
  }
}

// DELETE endpoint to force clear session
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("discord_session")
  console.log("[v0] Session forcibly cleared via DELETE")
  return NextResponse.json({ success: true, message: "Session cleared" })
}
