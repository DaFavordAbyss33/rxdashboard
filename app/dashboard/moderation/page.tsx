"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Server, Shield, AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { SyrupRxGeneralTab } from "@/components/syruprx/general-tab"
import Image from "next/image"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Bot configurations
const BOTS = [
  { id: "syruprx", name: "SyrupRx", description: "Maple Hospital utility bot" },
]

const GUILDS_PER_PAGE = 25

interface BotGuild {
  id: string
  name: string
  icon: string | null
}

export default function ModerationPage() {
  const { user, isLoading: authLoading, allGuilds } = useAuth()
  const [selectedBotId, setSelectedBotId] = useState<string>("syruprx")
  const [selectedGuildId, setSelectedGuildId] = useState<string>("")
  const [guildSearchQuery, setGuildSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch guilds where user has admin role for the selected bot
  const { data: adminGuildsData, isLoading: adminGuildsLoading } = useSWR(
    user && selectedBotId ? `/api/bots/${selectedBotId}/admin-guilds` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  // Fetch guilds the bot is installed in (includes guild details for master users)
  const { data: botGuildsData, isLoading: botGuildsLoading } = useSWR(
    selectedBotId ? `/api/bots/${selectedBotId}/guilds` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  const isMaster = adminGuildsData?.isMaster === true

  // Filter guilds where user has admin access AND bot is installed
  const accessibleGuilds = useMemo(() => {
    const adminGuildIds = new Set<string>(adminGuildsData?.adminGuildIds || [])
    const botGuilds: BotGuild[] = botGuildsData?.guilds || []
    const installedGuildIds = new Set(botGuilds.map((g) => g.id))

    // For master users: use bot guilds data (has all installed guilds with details)
    // For regular users: filter from their own guilds (allGuilds from auth context)
    if (isMaster) {
      // Master users can access all installed guilds
      return botGuilds.map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: false,
        permissions: "0",
        isInstalled: true,
      }))
    }

    // Regular users: filter to guilds they have admin access to AND bot is installed
    return allGuilds
      .filter((guild) => {
        const hasAccess = adminGuildIds.has(guild.id)
        const isInstalled = installedGuildIds.has(guild.id)
        return hasAccess && isInstalled
      })
      .map((guild) => ({
        ...guild,
        isInstalled: true,
      }))
  }, [adminGuildsData, botGuildsData, allGuilds, isMaster])

  // Filter by search query
  const filteredGuilds = useMemo(() => {
    if (!guildSearchQuery.trim()) return accessibleGuilds
    const query = guildSearchQuery.toLowerCase()
    return accessibleGuilds.filter((guild) =>
      guild.name.toLowerCase().includes(query) ||
      guild.id.includes(query)
    )
  }, [accessibleGuilds, guildSearchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredGuilds.length / GUILDS_PER_PAGE)
  const paginatedGuilds = useMemo(() => {
    const start = (currentPage - 1) * GUILDS_PER_PAGE
    return filteredGuilds.slice(start, start + GUILDS_PER_PAGE)
  }, [filteredGuilds, currentPage])

  // Reset page when search changes
  useMemo(() => {
    setCurrentPage(1)
  }, [guildSearchQuery])

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
              {isMaster && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Master Access
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isMaster ? "All installed servers" : "Servers where you have admin access"}
              {accessibleGuilds.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {accessibleGuilds.length} available
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <>
                {/* Search for large lists */}
                {accessibleGuilds.length > GUILDS_PER_PAGE && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search servers..."
                      value={guildSearchQuery}
                      onChange={(e) => setGuildSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}

                <Select value={selectedGuildId} onValueChange={setSelectedGuildId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a server" />
                  </SelectTrigger>
                  <SelectContent>
                    {paginatedGuilds.map((guild) => (
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

                {/* Pagination controls for large lists */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Page {currentPage} of {totalPages} ({filteredGuilds.length} servers)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
