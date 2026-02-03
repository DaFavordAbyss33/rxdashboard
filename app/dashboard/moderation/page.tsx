"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Bot, Server, Shield, AlertTriangle } from "lucide-react"
import { SyrupRxGeneralTab } from "@/components/syruprx/general-tab"
import Image from "next/image"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Bot configurations
const BOTS = [
  { id: "syruprx", name: "SyrupRx", description: "Maple Hospital utility bot" },
]

interface Guild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

export default function ModerationPage() {
  const { user, isLoading: authLoading, allGuilds } = useAuth()
  const [selectedBotId, setSelectedBotId] = useState<string>("syruprx")
  const [selectedGuildId, setSelectedGuildId] = useState<string>("")

  // Fetch guilds where user has admin role for the selected bot
  const { data: adminGuildsData, isLoading: adminGuildsLoading } = useSWR(
    user && selectedBotId ? `/api/bots/${selectedBotId}/admin-guilds` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  // Fetch guilds the bot is installed in
  const { data: botGuildsData, isLoading: botGuildsLoading } = useSWR(
    selectedBotId ? `/api/bots/${selectedBotId}/guilds` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  // Filter guilds where user has admin access AND bot is installed
  const accessibleGuilds = useMemo(() => {
    const adminGuildIds = new Set<string>(adminGuildsData?.adminGuildIds || [])
    const installedGuildIds = new Set(
      (botGuildsData?.guilds || []).map((g: { id: string }) => g.id)
    )
    const isMaster = adminGuildsData?.isMaster === true

    // Get guild details from allGuilds
    return allGuilds
      .filter((guild) => {
        const hasAccess = adminGuildIds.has(guild.id) || isMaster
        const isInstalled = installedGuildIds.has(guild.id)
        return hasAccess && isInstalled
      })
      .map((guild) => ({
        ...guild,
        isInstalled: installedGuildIds.has(guild.id),
      }))
  }, [adminGuildsData, botGuildsData, allGuilds])

  // Auto-select first guild if none selected
  useMemo(() => {
    if (!selectedGuildId && accessibleGuilds.length > 0) {
      setSelectedGuildId(accessibleGuilds[0].id)
    }
  }, [accessibleGuilds, selectedGuildId])

  const selectedBot = BOTS.find((b) => b.id === selectedBotId)
  const selectedGuild = accessibleGuilds.find((g) => g.id === selectedGuildId)

  const isLoading = authLoading || adminGuildsLoading || botGuildsLoading

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Authentication Required</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Please log in to access the moderation panel.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Moderation</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your servers with quick access to moderation commands
        </p>
      </div>

      {/* Selectors */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bot Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              Select Bot
            </CardTitle>
            <CardDescription>Choose which bot to use for moderation</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedBotId} onValueChange={setSelectedBotId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bot" />
              </SelectTrigger>
              <SelectContent>
                {BOTS.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id}>
                    <div className="flex items-center gap-2">
                      <span>{bot.name}</span>
                      <span className="text-xs text-muted-foreground">
                        - {bot.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Server Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" />
              Select Server
            </CardTitle>
            <CardDescription>
              Servers where you have admin access
              {accessibleGuilds.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {accessibleGuilds.length} available
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : accessibleGuilds.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  No servers available. You need admin role access on a server where{" "}
                  {selectedBot?.name || "the bot"} is installed.
                </span>
              </div>
            ) : (
              <Select value={selectedGuildId} onValueChange={setSelectedGuildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a server" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleGuilds.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      <div className="flex items-center gap-2">
                        {guild.icon ? (
                          <Image
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                            alt=""
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-xs">
                            {guild.name.charAt(0)}
                          </div>
                        )}
                        <span>{guild.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Moderation Panel */}
      {selectedGuildId && selectedBotId === "syruprx" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {selectedGuild?.icon ? (
                <Image
                  src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  {selectedGuild?.name?.charAt(0) || "?"}
                </div>
              )}
              <div>
                <span>{selectedGuild?.name || "Server"}</span>
                <Badge variant="outline" className="ml-2">
                  {selectedBot?.name}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Manage server settings and execute moderation commands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SyrupRxGeneralTab guildId={selectedGuildId} />
          </CardContent>
        </Card>
      ) : !selectedGuildId && accessibleGuilds.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <Server className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Select a Server</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a server from the dropdown above to start moderating
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
