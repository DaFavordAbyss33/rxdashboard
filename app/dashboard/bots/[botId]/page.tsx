"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  getBotById,
  getInstallationsForBot,
  isGuildInstalled,
  generateInviteUrl,
} from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"
import { useState } from "react"

interface BotDetailPageProps {
  params: Promise<{ botId: string }>
}

export default function BotDetailPage({ params }: BotDetailPageProps) {
  const { botId } = use(params)
  const { managableGuilds } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")

  const bot = getBotById(botId)
  if (!bot) {
    notFound()
  }

  const installations = getInstallationsForBot(botId)

  // Separate guilds into installed and not installed
  const installedGuilds = managableGuilds.filter((guild) =>
    isGuildInstalled(botId, guild.id)
  )
  const notInstalledGuilds = managableGuilds.filter(
    (guild) => !isGuildInstalled(botId, guild.id)
  )

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
          <TabsList className="mb-4">
            <TabsTrigger value="installed">
              Installed ({installedGuilds.length})
            </TabsTrigger>
            {!bot.isPrivate && (
              <TabsTrigger value="not-installed">
                Not Installed ({notInstalledGuilds.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="installed" className="mt-0">
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
                filterGuilds(installedGuilds).map((guild) => {
                  const installation = installations.find(
                    (i) => i.guildId === guild.id
                  )
                  return (
                    <GuildRow
                      key={guild.id}
                      guildId={guild.id}
                      guildName={guild.name}
                      memberCount={guild.memberCount}
                      isOwner={guild.owner}
                      isInstalled
                      premiumStatus={installation?.premiumStatus}
                      botId={botId}
                    />
                  )
                })
              )}
            </div>
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
                      inviteUrl={generateInviteUrl(bot, guild.id)}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

interface GuildRowProps {
  guildId: string
  guildName: string
  memberCount: number
  isOwner: boolean
  isInstalled: boolean
  premiumStatus?: "active" | "inactive" | "trial"
  botId: string
  inviteUrl?: string
}

function GuildRow({
  guildId,
  guildName,
  memberCount,
  isOwner,
  isInstalled,
  premiumStatus,
  botId,
  inviteUrl,
}: GuildRowProps) {
  const premiumBadge = {
    active: { label: "Premium", className: "bg-primary/20 text-primary" },
    trial: { label: "Trial", className: "bg-degraded/20 text-degraded" },
    inactive: null,
  }

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
            {premiumStatus && premiumBadge[premiumStatus] && (
              <Badge className={cn("text-xs", premiumBadge[premiumStatus]?.className)}>
                {premiumBadge[premiumStatus]?.label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {memberCount.toLocaleString()} members
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
