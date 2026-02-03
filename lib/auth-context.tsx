"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { DiscordUser, Guild } from "./types"
import { hasManageGuildPermission } from "./data"

interface SessionGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
  memberRoles?: string[]
}

interface AuthContextType {
  user: DiscordUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isAdminLoading: boolean
  login: () => void
  logout: () => void
  managableGuilds: Guild[]
  allGuilds: SessionGuild[] // All guilds user is in, with memberRoles
  refreshSession: () => Promise<void>
  refreshGuilds: () => Promise<void>
  guildsLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache key for guilds in sessionStorage
const GUILDS_CACHE_KEY = "discord_guilds_cache"
const GUILDS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedGuilds(): SessionGuild[] | null {
  if (typeof window === "undefined") return null
  try {
    const cached = sessionStorage.getItem(GUILDS_CACHE_KEY)
    if (!cached) return null
    const { guilds, timestamp } = JSON.parse(cached)
    // Check if cache is still valid
    if (Date.now() - timestamp > GUILDS_CACHE_TTL) {
      sessionStorage.removeItem(GUILDS_CACHE_KEY)
      return null
    }
    return guilds
  } catch {
    return null
  }
}

function setCachedGuilds(guilds: SessionGuild[]) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(GUILDS_CACHE_KEY, JSON.stringify({
      guilds,
      timestamp: Date.now(),
    }))
  } catch {
    // Ignore storage errors
  }
}

function clearCachedGuilds() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(GUILDS_CACHE_KEY)
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null)
  const [guilds, setGuilds] = useState<SessionGuild[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [guildsLoading, setGuildsLoading] = useState(true) // Start true until session check completes
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminLoading, setIsAdminLoading] = useState(true)

  // Fetch guilds from Discord API (separate from session)
  const fetchGuilds = useCallback(async (forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = getCachedGuilds()
      if (cached) {
        setGuilds(cached)
        return
      }
    }

    setGuildsLoading(true)
    try {
      const response = await fetch("/api/auth/guilds")
      const data = await response.json()

      if (data.success && data.guilds) {
        setGuilds(data.guilds)
        setCachedGuilds(data.guilds)
      }
    } catch (error) {
      console.error("Failed to fetch guilds:", error)
    } finally {
      setGuildsLoading(false)
    }
  }, [])

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session")
      const data = await response.json()

      if (data.isAuthenticated && data.user) {
        // Double-check on client side for mock data
        if (data.user.username === "BotAdmin" || data.user.id === "123456789012345678") {
          await fetch("/api/auth/session", { method: "DELETE" })
          setUser(null)
          setGuilds([])
          setIsAdmin(false)
          clearCachedGuilds()
          return
        }

        // Convert session user to DiscordUser format
        const discordUser: DiscordUser = {
          id: data.user.id,
          username: data.user.username,
          discriminator: data.user.discriminator,
          avatar: data.user.avatar,
          email: data.user.email,
          guilds: [],
        }
        setUser(discordUser)
        setIsAdmin(data.isAdmin === true)
        
        // Fetch guilds separately (with caching)
        await fetchGuilds()
      } else {
        setUser(null)
        setGuilds([])
        setIsAdmin(false)
        setGuildsLoading(false) // No user, no guilds to load
        clearCachedGuilds()
      }
    } catch (error) {
      console.error("Failed to fetch session:", error)
      setUser(null)
      setGuilds([])
      setIsAdmin(false)
      setGuildsLoading(false)
      clearCachedGuilds()
    } finally {
      setIsLoading(false)
      setIsAdminLoading(false)
    }
  }

  useEffect(() => {
    // Clear any old localStorage data from previous mock auth
    if (typeof window !== "undefined") {
      localStorage.removeItem("discord_auth")
      localStorage.removeItem("discord_access_token")
      localStorage.removeItem("discord_is_admin")
    }
    fetchSession()
  }, [])

  const login = () => {
    // Force clear any old session before redirecting to OAuth
    fetch("/api/auth/session", { method: "DELETE" })
      .then(() => {
        // Redirect to Discord OAuth
        window.location.href = "/api/auth/discord"
      })
      .catch(() => {
        // Redirect anyway
        window.location.href = "/api/auth/discord"
      })
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    }
    setUser(null)
    setGuilds([])
    setIsAdmin(false)
    clearCachedGuilds()
    window.location.href = "/"
  }

  const refreshSession = async () => {
    setIsLoading(true)
    setIsAdminLoading(true)
    await fetchSession()
  }

  const refreshGuilds = async () => {
    await fetchGuilds(true) // Force refresh
  }

  // Filter guilds where user has manage permissions
  const managableGuilds = guilds.filter((guild) => 
    hasManageGuildPermission(guild.permissions)
  ) as Guild[]

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        isAdminLoading,
        login,
        logout,
        managableGuilds,
        allGuilds: guilds, // Expose all guilds with memberRoles
        refreshSession,
        refreshGuilds,
        guildsLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
