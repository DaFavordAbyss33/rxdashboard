"use client"

import Link from "next/link"
import useSWR from "swr"
import { BotStatusCard } from "@/components/dashboard/bot-status-card"
import { IncidentsList } from "@/components/dashboard/incidents-list"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Bot, Server, AlertTriangle, DollarSign, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const { data: botsData, error: botsError, isLoading: botsLoading, mutate: mutateBots } = useSWR(
    "/api/bots",
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  const { data: statsData, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useSWR(
    "/api/stats",
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: incidentsData, error: incidentsError, isLoading: incidentsLoading, mutate: mutateIncidents } = useSWR(
    "/api/incidents?limit=5",
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  )

  const handleRefresh = () => {
    mutateBots()
    mutateStats()
    mutateIncidents()
  }

  const bots = botsData?.bots || []
  const stats = statsData || {}
  const incidents = incidentsData?.incidents || []

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Overview</h2>
          <p className="mt-1 text-muted-foreground">
            Monitor your bot ecosystem at a glance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </>
        ) : statsError ? (
          <div className="col-span-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            Failed to load stats. Please check your configuration.
          </div>
        ) : (
          <>
            <StatsCard
              title="Active Bots"
              value={`${stats.bots?.online || 0}/${stats.bots?.total || 0}`}
              icon={Bot}
              trend={stats.bots?.allOnline ? "All systems operational" : "Some bots offline"}
              trendUp={stats.bots?.allOnline}
            />
            <StatsCard
              title="Total Guilds"
              value={(stats.guilds?.total || 0).toLocaleString()}
              icon={Server}
              trend="Across all bots"
            />
            <StatsCard
              title="Active Subscriptions"
              value={(stats.subscriptions?.active || 0).toString()}
              icon={AlertTriangle}
              trend="Paid customers"
              trendUp={true}
            />
            <StatsCard
              title="Monthly Revenue"
              value={`$${(stats.revenue?.mrr || 0).toLocaleString()}`}
              icon={DollarSign}
              trend={`$${(stats.revenue?.available || 0).toFixed(2)} available`}
              trendUp={true}
            />
          </>
        )}
      </div>

      {/* Bot Hub Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Your Bots</h3>
          <Link
            href="/dashboard/bots"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {botsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : botsError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            Failed to load bots. Please check your environment variables.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot: any) => (
              <BotStatusCard
                key={bot.id}
                bot={bot}
                installedCount={bot.guildsCount || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Incidents */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Incidents</h3>
          <Link
            href="/dashboard/incidents"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {incidentsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : incidentsError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
            Failed to load incidents.
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            No recent incidents. All systems running smoothly.
          </div>
        ) : (
          <IncidentsList incidents={incidents} />
        )}
      </div>

      {/* Last Updated */}
      {statsData?.timestamp && (
        <p className="text-center text-xs text-muted-foreground">
          Last updated: {new Date(statsData.timestamp).toLocaleString()}
        </p>
      )}
    </div>
  )
}
