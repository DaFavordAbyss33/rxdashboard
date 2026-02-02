"use client"

import Link from "next/link"
import { bots, incidents, installations } from "@/lib/data"
import { BotStatusCard } from "@/components/dashboard/bot-status-card"
import { IncidentsList } from "@/components/dashboard/incidents-list"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Bot, Server, AlertTriangle, Activity } from "lucide-react"

export default function DashboardPage() {
  const onlineBots = bots.filter((b) => b.status === "online").length
  const totalGuilds = bots.reduce((acc, b) => acc + b.guildsCount, 0)
  const recentIncidents = incidents.filter((i) => i.type === "error").length
  const avgPing = Math.round(
    bots.filter((b) => b.status === "online").reduce((acc, b) => acc + b.wsPing, 0) /
      bots.filter((b) => b.status === "online").length
  )

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Overview</h2>
        <p className="mt-1 text-muted-foreground">
          Monitor your bot ecosystem at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Bots"
          value={`${onlineBots}/${bots.length}`}
          icon={Bot}
          trend={onlineBots === bots.length ? "All systems operational" : "Some bots offline"}
          trendUp={onlineBots === bots.length}
        />
        <StatsCard
          title="Total Guilds"
          value={totalGuilds.toLocaleString()}
          icon={Server}
          trend="Across all bots"
        />
        <StatsCard
          title="Recent Errors"
          value={recentIncidents.toString()}
          icon={AlertTriangle}
          trend="In the last 24h"
          trendUp={recentIncidents === 0}
        />
        <StatsCard
          title="Avg. Latency"
          value={`${avgPing}ms`}
          icon={Activity}
          trend="WebSocket ping"
          trendUp={avgPing < 100}
        />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <BotStatusCard
              key={bot.id}
              bot={bot}
              installedCount={installations.filter((i) => i.botId === bot.id).length}
            />
          ))}
        </div>
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
        <IncidentsList incidents={incidents.slice(0, 5)} />
      </div>
    </div>
  )
}
