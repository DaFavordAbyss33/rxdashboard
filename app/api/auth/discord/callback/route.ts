import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ADMIN_CONFIG, isMasterUser } from "@/lib/admin"

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || ""
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || ""
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "https://rxsystems.app"
const REDIRECT_URI = `${NEXTAUTH_URL}/api/auth/discord/callback`

interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
  global_name?: string
}

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

interface GuildMember {
  roles: string[]
  user?: DiscordUser
}

interface GuildWithRoles extends DiscordGuild {
  memberRoles?: string[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  console.log("[v0] Discord callback received - code:", !!code, "error:", error)

  // Check for missing environment variables
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.error("[v0] Missing Discord credentials")
    return NextResponse.redirect(new URL("/?error=missing_credentials", NEXTAUTH_URL))
  }

  if (error) {
    console.error("[v0] Discord OAuth error:", error, errorDescription)
    return NextResponse.redirect(new URL(`/?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`, NEXTAUTH_URL))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", NEXTAUTH_URL))
  }

  try {
    console.log("[v0] Starting token exchange...")
    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("[v0] Token exchange failed:", errorData)
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", NEXTAUTH_URL))
    }

    const tokens: DiscordTokenResponse = await tokenResponse.json()
    console.log("[v0] Token exchange successful, fetching user info...")

    // Fetch user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error("[v0] Failed to fetch user info")
      return NextResponse.redirect(new URL("/?error=user_fetch_failed", NEXTAUTH_URL))
    }

    const user: DiscordUser = await userResponse.json()
    console.log("[v0] User fetched:", user.username, "ID:", user.id)

    // Fetch user's guilds
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    let guilds: DiscordGuild[] = []
    if (guildsResponse.ok) {
      guilds = await guildsResponse.json()
      console.log("[v0] Guilds fetched:", guilds.length)
    } else {
      console.log("[v0] Failed to fetch guilds:", guildsResponse.status)
    }

    // Check if user is admin (master user OR has required role in admin guild)
    // We only need to check the admin guild, not ALL guilds
    let isAdmin = isMasterUser(user.id)
    
    if (!isAdmin) {
      // Only fetch member data for the admin guild to check admin status
      try {
        const adminMemberResponse = await fetch(
          `https://discord.com/api/users/@me/guilds/${ADMIN_CONFIG.guildId}/member`,
          {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          }
        )
        if (adminMemberResponse.ok) {
          const adminMember: GuildMember = await adminMemberResponse.json()
          isAdmin = adminMember.roles.includes(ADMIN_CONFIG.roleId)
        }
      } catch (err) {
        console.log("[v0] Could not check admin guild membership:", err)
      }
    }

    // ULTRA-MINIMAL SESSION: Only store essential auth data
    // Guild list will be fetched dynamically using the access token when needed
    // This keeps the cookie well under the 4KB limit (target: ~500 bytes)
    // DO NOT store guildIds - users in many servers will exceed the 4KB cookie limit
    const sessionData = {
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        globalName: user.global_name,
      },
      // NO guildIds - fetch dynamically with access token when needed
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      isAdmin,
    }

    const finalSessionJson = JSON.stringify(sessionData)
    const sessionSizeKB = finalSessionJson.length / 1024
    console.log("[v0] Session size:", finalSessionJson.length, "bytes (", sessionSizeKB.toFixed(2), "KB)")
    
    // Final safety check - should now be well under 1KB
    if (sessionSizeKB > 3.5) {
      console.error("[v0] WARNING: Session too large at", sessionSizeKB.toFixed(2), "KB - this should not happen!")
    }

    // Always use secure in production (Vercel sets NODE_ENV=production)
    const isProduction = NEXTAUTH_URL.startsWith("https://")
    
    // Create redirect response first
    const response = NextResponse.redirect(new URL("/dashboard/bots", NEXTAUTH_URL))
    
    // Set cookie directly on the response (required for redirects in Next.js)
    response.cookies.set("discord_session", finalSessionJson, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    console.log("[v0] Session cookie set, redirecting to /dashboard/bots")

    return response
  } catch (error) {
    console.error("[v0] OAuth callback error:", error)
    return NextResponse.redirect(new URL("/?error=callback_failed", NEXTAUTH_URL))
  }
}
