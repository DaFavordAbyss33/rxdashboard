"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { DiscordUser, Guild } from "./types"
import { guilds, hasManageGuildPermission } from "./data"

interface AuthContextType {
  user: DiscordUser | null
  isLoading: boolean
  isAuthenticated: boolean
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

  useEffect(() => {
    // Check for existing session
    const storedAuth = localStorage.getItem("discord_auth")
    if (storedAuth) {
      setUser(mockUser)
    }
    setIsLoading(false)
  }, [])

  const login = () => {
    // In production, redirect to Discord OAuth
    // For now, we'll simulate login
    localStorage.setItem("discord_auth", "true")
    setUser(mockUser)
  }

  const logout = () => {
    localStorage.removeItem("discord_auth")
    setUser(null)
  }

  // Filter guilds where user has manage permissions
  const managableGuilds = user?.guilds.filter((guild) => hasManageGuildPermission(guild.permissions)) ?? []

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
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
