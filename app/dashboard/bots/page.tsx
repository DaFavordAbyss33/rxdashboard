"use client"

import useSWR from "swr"
import { BotStatusCard } from "@/components/dashboard/bot-status-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BotsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/bots", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  })

  const bots = data?.bots || []

  if (data) {
    console.log("[v0] Bots API response:", JSON.stringify({ error: data.error, botCount: bots.length, timestamp: data.timestamp }))
  }
  if (error) {
    console.log("[v0] Bots SWR error:", error)
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Your Bots</h2>
          <p className="mt-1 text-muted-foreground">
            Select a bot to manage its guilds and configuration
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">Failed to load bots</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your environment variables and API connections.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Bot Grid */}
      {!isLoading && !error && (
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

      {/* Last Updated */}
      {data?.timestamp && (
        <p className="text-center text-xs text-muted-foreground">
          Last updated: {new Date(data.timestamp).toLocaleString()}
        </p>
      )}
    </div>
  )
}
