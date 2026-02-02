"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { DiscordUser, Guild } from "./types"
import { guilds, hasManageGuildPermission } from "./data"
import { ADMIN_CONFIG } from "./admin"

interface AuthContextType {
  user: DiscordUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isAdminLoading: boolean
  accessToken: string | null
  login: () => void
  logout: () => void
  managableGuilds: Guild[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user for development - in production, use NextAuth or similar
const mockUser: DiscordUser = {
  id: "123456789012345678",
  username: "BotAdmin",
  discriminator: "0",
  avatar: null,
  email: "admin@example.com",
  guilds: guilds,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminLoading, setIsAdminLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Check admin role when user or token changes
  const verifyAdminRole = async (token: string) => {
    setIsAdminLoading(true)
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      })
      const data = await response.json()
      setIsAdmin(data.isAdmin === true)
    } catch (error) {
      console.error("Failed to verify admin role:", error)
      setIsAdmin(false)
    } finally {
      setIsAdminLoading(false)
    }
  }

  useEffect(() => {
    // Check for existing session
    const storedAuth = localStorage.getItem("discord_auth")
    const storedToken = localStorage.getItem("discord_access_token")
    const storedIsAdmin = localStorage.getItem("discord_is_admin")
    
    if (storedAuth) {
      setUser(mockUser)
      if (storedToken) {
        setAccessToken(storedToken)
        verifyAdminRole(storedToken)
      } else {
        // For mock/development mode, check localStorage admin flag
        setIsAdmin(storedIsAdmin === "true")
        setIsAdminLoading(false)
      }
    } else {
      setIsAdminLoading(false)
    }
    setIsLoading(false)
  }, [])

  const login = () => {
    // In production, redirect to Discord OAuth with guilds.members.read scope
    // For now, we'll simulate login with admin access for testing
    localStorage.setItem("discord_auth", "true")
    localStorage.setItem("discord_is_admin", "true") // For development, set to true
    setUser(mockUser)
    setIsAdmin(true) // For development mode
    setIsAdminLoading(false)
  }

  const logout = () => {
    localStorage.removeItem("discord_auth")
    localStorage.removeItem("discord_access_token")
    localStorage.removeItem("discord_is_admin")
    setUser(null)
    setAccessToken(null)
    setIsAdmin(false)
  }

  // Filter guilds where user has manage permissions
  const managableGuilds = user?.guilds.filter((guild) => hasManageGuildPermission(guild.permissions)) ?? []

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin,
        isAdminLoading,
        accessToken,
        login,
        logout,
        managableGuilds,
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
