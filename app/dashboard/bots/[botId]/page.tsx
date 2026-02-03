"use client"

import { use, useState, useMemo } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { generateBotInviteUrl } from "@/lib/invite"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Bot as BotIcon,
  Server,
  Clock,
  Zap,
  Search,
  ExternalLink,
  Settings,
  Crown,
  Lock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Bot {
  id: string
  name: string
  description: string
  icon: string
  clientId: string
  inviteScopes: string[]
  permissionsInt: string
  capabilities: {
    channels?: string[]
    keys?: string[]
    features?: string[]
    premium?: boolean
  }
  status: "online" | "offline" | "degraded"
  guildsCount: number
  wsPing: number
  uptime: string
  hasSubscription?: boolean
  isPrivate?: boolean
}

interface BotGuild {
  id: string
  name: string
  icon: string | null
  iconUrl: string | null
}

interface BotDetailPageProps {
  params: Promise<{ botId: string }>
}

export default function BotDetailPage({ params }: BotDetailPageProps) {
  const { botId } = use(params)
  const { managableGuilds, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAllGuilds, setShowAllGuilds] = useState(false)
  const [allGuildsPage, setAllGuildsPage] = useState(1)
  const ALL_GUILDS_PER_PAGE = 10

  // Fetch bot data from API
  const { data: botsData, error: botsError, isLoading: botsLoading } = useSWR(
    "/api/bots",
    fetcher,
    { refreshInterval: 30000 }
  )

  // Fetch guilds the bot is installed in
  const { data: guildsData, error: guildsError, isLoading: guildsLoading, mutate: refreshGuilds } = useSWR(
    `/api/bots/${botId}/guilds`,
    fetcher,
    { refreshInterval: 60000 }
  )

  // Fetch guilds where user has admin role for this bot (not just Discord permissions)
  const { data: adminGuildsData } = useSWR(
    user ? `/api/bots/${botId}/admin-guilds` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  const bot = botsData?.bots?.find((b: Bot) => b.id === botId) as Bot | undefined
  const installedGuildIds = new Set(
    (guildsData?.guilds || []).map((g: BotGuild) => g.id)
  )

  // Get the list of guild IDs where user has bot-specific admin role
  const adminRoleGuildIds = new Set<string>(adminGuildsData?.adminGuildIds || [])
  const isMasterUser = adminGuildsData?.isMaster === true
  // All guild IDs where bot is installed (only available for master users)
  const allInstalledGuildIds = new Set<string>(adminGuildsData?.allGuildIds || [])

  // Combine: user can access guilds they manage via Discord permissions OR have bot admin role
  // For master users, we separate "permissioned" guilds from "all other" guilds
  const { installedGuilds, notInstalledGuilds, allOtherGuilds } = useMemo(() => {
    // Get bot guild data to merge with user's guilds
    const botGuilds = guildsData?.guilds || []
    
    // Create a map of installed guilds from bot data
    const botGuildMap = new Map<string, BotGuild>()
    for (const g of botGuilds) {
      botGuildMap.set(g.id, g)
    }

    // Start with manageable guilds (Discord perms: Owner, Administrator, Manage Guild)
    const accessibleGuildsMap = new Map<string, typeof managableGuilds[0]>()
    for (const guild of managableGuilds) {
      accessibleGuildsMap.set(guild.id, guild)
    }

    // Add guilds where user has bot admin role (from Setup tab)
    for (const guildId of adminRoleGuildIds) {
      if (!accessibleGuildsMap.has(guildId) && botGuildMap.has(guildId)) {
        const botGuild = botGuildMap.get(guildId)!
        // Create a guild entry for admin role access
        accessibleGuildsMap.set(guildId, {
          id: guildId,
          name: botGuild.name,
          icon: botGuild.icon,
          memberCount: undefined,
          owner: false,
          permissions: "0", // No Discord perms, but has bot admin role
          hasAdminRole: true, // Flag to indicate access is via admin role
        } as typeof managableGuilds[0] & { hasAdminRole?: boolean })
      }
    }

    const allAccessibleGuilds = Array.from(accessibleGuildsMap.values())
    const installed = allAccessibleGuilds.filter((guild) => installedGuildIds.has(guild.id))
    const notInstalled = allAccessibleGuilds.filter((guild) => !installedGuildIds.has(guild.id))
    
    // For master users: get all OTHER guilds (not in permissioned list)
    const permissionedGuildIds = new Set(allAccessibleGuilds.map(g => g.id))
    const otherGuilds: Array<typeof managableGuilds[0] & { hasAdminRole?: boolean; isMasterOnly?: boolean }> = []
    
    if (isMasterUser) {
      for (const guildId of allInstalledGuildIds) {
        if (!permissionedGuildIds.has(guildId) && botGuildMap.has(guildId)) {
          const botGuild = botGuildMap.get(guildId)!
          otherGuilds.push({
            id: guildId,
            name: botGuild.name,
            icon: botGuild.icon,
            memberCount: undefined,
            owner: false,
            permissions: "0",
            isMasterOnly: true, // Flag to indicate this is master-only access
          } as typeof managableGuilds[0] & { isMasterOnly?: boolean })
        }
      }
    }
    
    return { installedGuilds: installed, notInstalledGuilds: notInstalled, allOtherGuilds: otherGuilds }
  }, [managableGuilds, installedGuildIds, adminRoleGuildIds, guildsData?.guilds, isMasterUser, allInstalledGuildIds])

  // Filter by search
  const filterGuilds = (guilds: typeof managableGuilds) =>
    guilds.filter((guild) =>
      guild.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const statusColors = {
    online: "bg-online",
    offline: "bg-offline",
    degraded: "bg-degraded",
  }

  // Loading state
  if (botsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Bot not found
  if (!bot || botsError) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/bots"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bots
      </Link>

      {/* Bot Header */}
      <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary">
            <BotIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-card-foreground">{bot.name}</h1>
              <div className="flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", statusColors[bot.status])}
                />
                <span className="text-sm text-muted-foreground capitalize">
                  {bot.status}
                </span>
              </div>
            </div>
            <p className="mt-1 text-muted-foreground">{bot.description}</p>
          </div>
        </div>

        {/* Bot Stats */}
        <div className="flex gap-6 rounded-lg bg-secondary/50 px-6 py-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Server className="h-3 w-3" />
              Guilds
            </div>
            <div className="mt-1 text-xl font-bold text-card-foreground">
              {bot.guildsCount}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              Ping
            </div>
            <div className="mt-1 text-xl font-bold text-card-foreground">
              {bot.status === "offline" ? "-" : `${bot.wsPing}ms`}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Uptime
            </div>
            <div className="mt-1 text-xl font-bold text-card-foreground">
              {bot.uptime}
            </div>
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-card-foreground">Capabilities</h3>
        <div className="flex flex-wrap gap-2">
          {bot.capabilities.features?.map((feature) => (
            <Badge key={feature} variant="secondary">
              {feature}
            </Badge>
          ))}
          {bot.capabilities.channels?.map((channel) => (
            <Badge key={channel} variant="outline">
              #{channel}
            </Badge>
          ))}
          {bot.capabilities.premium && (
            <Badge className="bg-primary/20 text-primary">
              <Crown className="mr-1 h-3 w-3" />
              Premium
            </Badge>
          )}
          {bot.isPrivate && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              <Lock className="mr-1 h-3 w-3" />
              Private Bot
            </Badge>
          )}
        </div>
      </div>

      {/* Guild Management */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-6">
          <h3 className="font-semibold text-card-foreground">Guild Management</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage {bot.name} across your Discord servers
          </p>
        </div>

        {/* Search */}
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search guilds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs for Installed / Not Installed */}
        <Tabs defaultValue="installed" className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="installed">
                Installed ({guildsLoading ? "..." : installedGuilds.length})
              </TabsTrigger>
              {!bot.isPrivate && (
                <TabsTrigger value="not-installed">
                  Not Installed ({notInstalledGuilds.length})
                </TabsTrigger>
              )}
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshGuilds()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <TabsContent value="installed" className="mt-0">
            {guildsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {filterGuilds(installedGuilds).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center">
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No installed guilds match your search"
                        : "No guilds have this bot installed yet"}
                    </p>
                  </div>
                ) : (
                  filterGuilds(installedGuilds).map((guild) => (
                    <GuildRow
                      key={guild.id}
                      guildId={guild.id}
                      guildName={guild.name}
                      memberCount={guild.memberCount}
                      isOwner={guild.owner}
                      isInstalled
                      botId={botId}
                      hasAdminRole={(guild as typeof guild & { hasAdminRole?: boolean }).hasAdminRole}
                    />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {!bot.isPrivate && (
            <TabsContent value="not-installed" className="mt-0">
              <div className="space-y-2">
                {filterGuilds(notInstalledGuilds).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center">
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No guilds match your search"
                        : "All your managable guilds have this bot installed"}
                    </p>
                  </div>
                ) : (
                  filterGuilds(notInstalledGuilds).map((guild) => (
                    <GuildRow
                      key={guild.id}
                      guildId={guild.id}
                      guildName={guild.name}
                      memberCount={guild.memberCount}
                      isOwner={guild.owner}
                      isInstalled={false}
                      botId={botId}
                      inviteUrl={generateBotInviteUrl(bot, guild.id) || undefined}
                      hasAdminRole={(guild as typeof guild & { hasAdminRole?: boolean }).hasAdminRole}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Master User: Show All Guilds Button & Section */}
        {isMasterUser && allOtherGuilds.length > 0 && (
          <div className="border-t border-border p-6">
            {!showAllGuilds ? (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setShowAllGuilds(true)
                  setAllGuildsPage(1)
                }}
              >
                <Eye className="h-4 w-4" />
                Show All Guilds ({allOtherGuilds.length} more)
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-card-foreground">All Other Guilds</h4>
                    <Badge variant="secondary" className="text-xs">
                      Master Access
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllGuilds(false)}
                  >
                    Hide
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  These guilds are accessible via master user privileges only.
                </p>
                
                {/* Guild List */}
                <div className="space-y-2">
                  {(() => {
                    const filteredOtherGuilds = filterGuilds(allOtherGuilds)
                    const totalPages = Math.ceil(filteredOtherGuilds.length / ALL_GUILDS_PER_PAGE)
                    const startIndex = (allGuildsPage - 1) * ALL_GUILDS_PER_PAGE
                    const paginatedGuilds = filteredOtherGuilds.slice(startIndex, startIndex + ALL_GUILDS_PER_PAGE)
                    
                    return (
                      <>
                        {paginatedGuilds.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center">
                            <p className="text-muted-foreground">
                              No guilds match your search
                            </p>
                          </div>
                        ) : (
                          paginatedGuilds.map((guild) => (
                            <GuildRow
                              key={guild.id}
                              guildId={guild.id}
                              guildName={guild.name}
                              memberCount={guild.memberCount}
                              isOwner={false}
                              isInstalled
                              botId={botId}
                              isMasterOnly
                            />
                          ))
                        )}
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-4">
                            <p className="text-sm text-muted-foreground">
                              Showing {startIndex + 1}-{Math.min(startIndex + ALL_GUILDS_PER_PAGE, filteredOtherGuilds.length)} of {filteredOtherGuilds.length} guilds
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAllGuildsPage(p => Math.max(1, p - 1))}
                                disabled={allGuildsPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                Page {allGuildsPage} of {totalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAllGuildsPage(p => Math.min(totalPages, p + 1))}
                                disabled={allGuildsPage === totalPages}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface GuildRowProps {
  guildId: string
  guildName: string
  memberCount?: number
  isOwner: boolean
  isInstalled: boolean
  botId: string
  inviteUrl?: string
  hasAdminRole?: boolean
  isMasterOnly?: boolean
}

function GuildRow({
  guildId,
  guildName,
  memberCount,
  isOwner,
  isInstalled,
  botId,
  inviteUrl,
  hasAdminRole,
  isMasterOnly,
}: GuildRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Server className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-card-foreground">{guildName}</span>
            {isOwner && (
              <Badge variant="outline" className="text-xs">
                Owner
              </Badge>
            )}
            {!isOwner && hasAdminRole && (
              <Badge variant="secondary" className="text-xs">
                Admin Role
              </Badge>
            )}
            {!isOwner && !hasAdminRole && isMasterOnly && (
              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                Master Access
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {memberCount ? `${memberCount.toLocaleString()} members` : "Discord Server"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isInstalled ? (
          <Button asChild size="sm">
            <Link href={`/dashboard/bots/${botId}/guilds/${guildId}`}>
              <Settings className="mr-1 h-4 w-4" />
              Configure
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              Invite
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
