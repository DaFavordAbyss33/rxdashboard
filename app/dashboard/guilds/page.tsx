"use client"

import { useMemo } from "react"
import Link from "next/link"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Server, Bot as BotIcon, Settings, ExternalLink } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Bot {
  id: string
  name: string
  isPrivate?: boolean
}

interface BotGuild {
  id: string
  name: string
}

export default function GuildsPage() {
  const { managableGuilds } = useAuth()

  // Fetch all bots
  const { data: botsData, isLoading: botsLoading } = useSWR("/api/bots", fetcher)
  const bots = (botsData?.bots || []) as Bot[]

  // Fetch all guild installations in one API call
  const { data: installationsData, isLoading: installationsLoading } = useSWR(
    "/api/guilds/installations",
    fetcher
  )

  // Create a map of guildId -> installed botIds
  const guildBotMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (installationsData?.installations) {
      Object.entries(installationsData.installations).forEach(([botId, guilds]) => {
        (guilds as BotGuild[]).forEach((guild) => {
          const existing = map.get(guild.id) || []
          existing.push(botId)
          map.set(guild.id, existing)
        })
      })
    }
    return map
  }, [installationsData])

  const isLoading = botsLoading || installationsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Guilds</h2>
        <p className="mt-1 text-muted-foreground">
          View all servers you can manage and their bot installations
        </p>
      </div>

      {/* Guild List */}
      <div className="space-y-4">
        {managableGuilds.map((guild) => {
          const installedBotIds = guildBotMap.get(guild.id) || []
          const installedBots = bots.filter((bot) => installedBotIds.includes(bot.id))

          return (
            <div
              key={guild.id}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary">
                    <Server className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-card-foreground">
                        {guild.name}
                      </h3>
                      {guild.owner && (
                        <Badge variant="outline" className="text-xs">
                          Owner
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {guild.memberCount.toLocaleString()} members
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {installedBots.length} bot{installedBots.length !== 1 ? "s" : ""}{" "}
                    installed
                  </p>
                </div>
              </div>

              {/* Installed Bots */}
              {installedBots.length > 0 && (
                <div className="mt-4 rounded-lg bg-secondary/30 p-4">
                  <p className="mb-3 text-sm font-medium text-card-foreground">
                    Installed Bots
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {installedBots.map((bot) => (
                      <Link
                        key={bot.id}
                        href={`/dashboard/bots/${bot.id}/guilds/${guild.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/50"
                      >
                        <BotIcon className="h-4 w-4 text-primary" />
                        <span className="text-card-foreground">{bot.name}</span>
                        <Settings className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Available to Install */}
              {installedBots.length < bots.length && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Available to install:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bots
                      .filter((bot) => !installedBots.some((b) => b.id === bot.id))
                      .map((bot) => (
                        <Button
                          key={bot.id}
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/bots/${bot.id}`}>
                            <ExternalLink className="mr-1 h-3 w-3" />
                            {bot.name}
                          </Link>
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
