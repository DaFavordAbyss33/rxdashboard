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

      if (data.isAuthenticated && data.user) {
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
    fetchSession()
  }, [])

  const login = () => {
    // Redirect to Discord OAuth
    window.location.href = "/api/auth/discord"
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
