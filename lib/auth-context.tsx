"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
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
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null)
  const [guilds, setGuilds] = useState<SessionGuild[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminLoading, setIsAdminLoading] = useState(true)

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session")
      const data = await response.json()

      console.log("[v0] Client received session data:", data)

      if (data.isAuthenticated && data.user) {
        // Double-check on client side for mock data
        if (data.user.username === "BotAdmin" || data.user.id === "123456789012345678") {
          console.log("[v0] Client detected mock data, clearing session")
          await fetch("/api/auth/session", { method: "DELETE" })
          setUser(null)
          setGuilds([])
          setIsAdmin(false)
          return
        }

        // Convert session user to DiscordUser format
        const discordUser: DiscordUser = {
          id: data.user.id,
          username: data.user.username,
          discriminator: data.user.discriminator,
          avatar: data.user.avatar,
          email: data.user.email,
          guilds: data.guilds || [],
        }
        setUser(discordUser)
        setGuilds(data.guilds || [])
        setIsAdmin(data.isAdmin === true)
      } else {
        setUser(null)
        setGuilds([])
        setIsAdmin(false)
      }
    } catch (error) {
      console.error("Failed to fetch session:", error)
      setUser(null)
      setGuilds([])
      setIsAdmin(false)
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
    window.location.href = "/"
  }

  const refreshSession = async () => {
    setIsLoading(true)
    setIsAdminLoading(true)
    await fetchSession()
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
        refreshSession,
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
