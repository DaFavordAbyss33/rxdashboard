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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Bot, Server, Shield, AlertTriangle, ChevronLeft, ChevronRight, Search, 
  ScrollText, Clock, UserX, Ban, Settings, Megaphone, Power, Filter 
} from "lucide-react"
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
  const [activeTab, setActiveTab] = useState("server")
  const [auditPage, setAuditPage] = useState(1)
  const [auditCategory, setAuditCategory] = useState("all")
  const [auditSearch, setAuditSearch] = useState("")

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

  // Fetch audit logs when audit tab is active
  const auditQueryParams = new URLSearchParams({
    guildId: selectedGuildId || "",
    page: String(auditPage),
    limit: "50",
    ...(auditCategory !== "all" && { category: auditCategory }),
    ...(auditSearch && { search: auditSearch }),
  })
  const { data: auditData, isLoading: auditLoading } = useSWR(
    selectedGuildId && selectedBotId && activeTab === "audit"
      ? `/api/bots/${selectedBotId}/audit-logs?${auditQueryParams.toString()}`
      : null,
    fetcher,
    { refreshInterval: 15000 }
  )

  const isMaster = adminGuildsData?.isMaster === true

  // Helper to check if user has Discord manage guild permission
  const hasManageGuildPermission = (permissions: string) => {
    const perms = BigInt(permissions || 0)
    const MANAGE_GUILD = BigInt(0x20)
    const ADMINISTRATOR = BigInt(0x8)
    return (perms & MANAGE_GUILD) === MANAGE_GUILD || (perms & ADMINISTRATOR) === ADMINISTRATOR
  }

  // Filter guilds where user has access (admin role OR Discord permissions) AND bot is installed
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

    // Regular users: filter to guilds where:
    // 1. They have admin role access (from bot config), OR
    // 2. They are the owner, OR
    // 3. They have Discord MANAGE_GUILD/ADMINISTRATOR permission
    // AND the bot is installed in that guild
    return allGuilds
      .filter((guild) => {
        const hasAdminRole = adminGuildIds.has(guild.id)
        const isOwner = guild.owner === true
        const hasDiscordPerms = hasManageGuildPermission(guild.permissions)
        const hasAccess = hasAdminRole || isOwner || hasDiscordPerms
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
                  <SelectContent className="max-h-[300px] overflow-y-auto">
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
            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setAuditPage(1) }}>
              <TabsList className="mb-4">
                <TabsTrigger value="server" className="gap-2">
                  <Server className="h-4 w-4" />
                  Server
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-2">
                  <ScrollText className="h-4 w-4" />
                  Audit Log
                </TabsTrigger>
              </TabsList>

              <TabsContent value="server">
                <SyrupRxGeneralTab guildId={selectedGuildId} />
              </TabsContent>

              <TabsContent value="audit">
                <AuditLogTab
                  logs={auditData?.logs || []}
                  total={auditData?.total || 0}
                  page={auditPage}
                  totalPages={auditData?.totalPages || 0}
                  isLoading={auditLoading}
                  category={auditCategory}
                  search={auditSearch}
                  onPageChange={setAuditPage}
                  onCategoryChange={(cat) => { setAuditCategory(cat); setAuditPage(1) }}
                  onSearchChange={setAuditSearch}
                />
              </TabsContent>
            </Tabs>
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

// Audit Log Tab Component
const ACTION_ICONS: Record<string, typeof Clock> = {
  kick: UserX,
  ban: Ban,
  unban: Ban,
  announce: Megaphone,
  settings: Settings,
  banner: Settings,
  shutdown: Power,
  config_update: Settings,
}

const ACTION_COLORS: Record<string, string> = {
  kick: "text-amber-500",
  ban: "text-destructive",
  unban: "text-green-500",
  announce: "text-blue-500",
  settings: "text-muted-foreground",
  banner: "text-muted-foreground",
  shutdown: "text-destructive",
  config_update: "text-primary",
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  moderation: "Moderation",
  server: "Server",
  config: "Config",
  system: "System",
}

interface AuditLogEntry {
  _id: string
  botId: string
  guildId: string
  action: string
  category: string
  details: Record<string, unknown>
  executedBy: { id: string; username: string; avatar?: string }
  targetUser?: { id: string | number; name?: string }
  success: boolean
  error?: string
  timestamp: string
}

function AuditLogTab({
  logs,
  total,
  page,
  totalPages,
  isLoading,
  category,
  search,
  onPageChange,
  onCategoryChange,
  onSearchChange,
}: {
  logs: AuditLogEntry[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  category: string
  search: string
  onPageChange: (p: number) => void
  onCategoryChange: (c: string) => void
  onSearchChange: (s: string) => void
}) {
  function formatTimestamp(ts: string) {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return "Just now"
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  function formatAction(action: string) {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function getActionDescription(entry: AuditLogEntry) {
    const { action, details, targetUser } = entry
    switch (action) {
      case "kick":
        return `Kicked ${targetUser?.name || "a user"}${details.reason ? ` - ${details.reason}` : ""}`
      case "ban":
        return `Banned ${targetUser?.name || "a user"}`
      case "unban":
        return `Unbanned ${targetUser?.name || "a user"}`
      case "announce":
        return `Sent announcement: "${String(details.message || "").slice(0, 80)}${String(details.message || "").length > 80 ? "..." : ""}"`
      case "shutdown":
        return "Shut down the server"
      case "settings":
        return `Updated server settings`
      case "banner":
        return `Set banner text`
      case "config_update": {
        const fields = (details.changedFields as string[]) || []
        if (fields.length === 0) return "Updated configuration"
        if (fields.length <= 3) return `Updated config: ${fields.join(", ")}`
        return `Updated ${fields.length} config fields`
      }
      default:
        return formatAction(action)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[160px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">
          {total.toLocaleString()} total entries
        </Badge>
      </div>

      {/* Log Entries */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <ScrollText className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No audit logs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Actions executed on this server will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => {
            const IconComponent = ACTION_ICONS[entry.action] || Clock
            const colorClass = ACTION_COLORS[entry.action] || "text-muted-foreground"
            return (
              <div
                key={entry._id}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/30"
              >
                <div className={`mt-0.5 shrink-0 ${colorClass}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {formatAction(entry.action)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.category}
                    </Badge>
                    {!entry.success && (
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground truncate">
                    {getActionDescription(entry)}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {entry.executedBy.avatar ? (
                        <Image
                          src={`https://cdn.discordapp.com/avatars/${entry.executedBy.id}/${entry.executedBy.avatar}.png`}
                          alt=""
                          width={14}
                          height={14}
                          className="rounded-full"
                        />
                      ) : null}
                      {entry.executedBy.username}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
