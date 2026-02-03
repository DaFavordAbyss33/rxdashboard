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

    // Fetch member roles for ALL guilds (needed for bot admin role checks)
    // This allows users with bot-configured admin roles to access guild management
    // even if they don't have Discord's Manage Server permission
    const guildsWithRoles: GuildWithRoles[] = await Promise.all(
      guilds.map(async (guild) => {
        try {
          const memberResponse = await fetch(
            `https://discord.com/api/users/@me/guilds/${guild.id}/member`,
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            }
          )

          if (memberResponse.ok) {
            const member: GuildMember = await memberResponse.json()
            return { ...guild, memberRoles: member.roles }
          }
        } catch (err) {
          console.error(`Failed to fetch member roles for guild ${guild.id}:`, err)
        }
        return guild
      })
    )

    // Check if user is admin (master user OR has required role in admin guild)
    let isAdmin = isMasterUser(user.id)
    
    if (!isAdmin) {
      const adminGuild = guildsWithRoles.find((g) => g.id === ADMIN_CONFIG.guildId)
      if (adminGuild && adminGuild.memberRoles) {
        isAdmin = adminGuild.memberRoles.includes(ADMIN_CONFIG.roleId)
      }
    }

    // Create session data
    const sessionData = {
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        email: user.email,
        globalName: user.global_name,
      },
      guilds: guildsWithRoles.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        owner: g.owner,
        permissions: g.permissions,
        memberRoles: g.memberRoles || [],
      })),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      isAdmin,
    }

    // Store session in HTTP-only cookie using Response headers (more reliable)
    // CRITICAL: Cookies have a ~4KB size limit. Browsers SILENTLY REJECT cookies over this limit.
    // We MUST keep the session extremely small - store only essential auth data.
    // Guild data can be fetched separately using the access token.
    
    const MANAGE_GUILD = 0x20
    const ADMINISTRATOR = 0x8
    
    // Only keep guilds where user has manage permissions (drastically reduces size)
    const manageableGuilds = sessionData.guilds.filter((g: { id: string; name: string; icon: string | null; owner: boolean; permissions: string; memberRoles: string[] }) => {
      const perms = parseInt(g.permissions)
      return g.owner || (perms & ADMINISTRATOR) !== 0 || (perms & MANAGE_GUILD) !== 0
    }).map((g: { id: string; name: string; icon: string | null; owner: boolean; permissions: string; memberRoles: string[] }) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
      memberRoles: g.memberRoles,
    }))
    
    // Create minimal session with only manageable guilds
    let minimalSessionData: {
      user: typeof sessionData.user;
      guilds: typeof manageableGuilds;
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      isAdmin: boolean;
    } = {
      user: sessionData.user,
      guilds: manageableGuilds,
      accessToken: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      expiresAt: sessionData.expiresAt,
      isAdmin: sessionData.isAdmin,
    }
    
    let finalSessionJson = JSON.stringify(minimalSessionData)
    let sessionSizeKB = finalSessionJson.length / 1024
    console.log("[v0] Session with manageable guilds:", finalSessionJson.length, "bytes (", sessionSizeKB.toFixed(2), "KB), guilds:", manageableGuilds.length)
    
    // If STILL too large, strip memberRoles from all guilds
    if (sessionSizeKB > 3.5) {
      console.log("[v0] Still too large, stripping all memberRoles")
      minimalSessionData = {
        ...minimalSessionData,
        guilds: manageableGuilds.map(g => ({
          ...g,
          memberRoles: [], // Remove all roles to save space
        })),
      }
      finalSessionJson = JSON.stringify(minimalSessionData)
      sessionSizeKB = finalSessionJson.length / 1024
      console.log("[v0] After stripping roles:", finalSessionJson.length, "bytes (", sessionSizeKB.toFixed(2), "KB)")
    }
    
    // If STILL too large, remove guilds entirely (user can still auth, just won't see guilds in session)
    if (sessionSizeKB > 3.5) {
      console.log("[v0] STILL too large, removing all guilds from session")
      minimalSessionData = {
        ...minimalSessionData,
        guilds: [],
      }
      finalSessionJson = JSON.stringify(minimalSessionData)
      sessionSizeKB = finalSessionJson.length / 1024
      console.log("[v0] After removing guilds:", finalSessionJson.length, "bytes (", sessionSizeKB.toFixed(2), "KB)")
    }
    
    console.log("[v0] FINAL session size:", finalSessionJson.length, "bytes (", sessionSizeKB.toFixed(2), "KB), isAdmin:", isAdmin)

    // Create redirect response with cookie set via headers
    const response = NextResponse.redirect(new URL("/dashboard/bots", NEXTAUTH_URL))
    
    // Always use secure in production (Vercel sets NODE_ENV=production)
    const isProduction = NEXTAUTH_URL.startsWith("https://")
    console.log("[v0] Setting cookie with secure:", isProduction, "NEXTAUTH_URL:", NEXTAUTH_URL)
    
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
