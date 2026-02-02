"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { IncidentsList } from "@/components/dashboard/incidents-list"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Incident {
  id: string
  botId: string
  guildId?: string
  type: "error" | "warning" | "info"
  message: string
  stack?: string
  createdAt: string
}

interface Bot {
  id: string
  name: string
}

export default function IncidentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [botFilter, setBotFilter] = useState<string>("all")

  // Fetch incidents from API
  const { data: incidentsData, isLoading, mutate: refreshIncidents } = useSWR(
    "/api/incidents?limit=100",
    fetcher,
    { refreshInterval: 30000 }
  )

  // Fetch bots for filter dropdown
  const { data: botsData } = useSWR("/api/bots", fetcher)

  const incidents = incidentsData?.incidents || []
  const bots = botsData?.bots || []

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident: Incident) => {
      const matchesSearch = incident.message
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "all" || incident.type === typeFilter
      const matchesBot = botFilter === "all" || incident.botId === botFilter
      return matchesSearch && matchesType && matchesBot
    })
  }, [incidents, searchQuery, typeFilter, botFilter])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Incidents</h2>
          <p className="mt-1 text-muted-foreground">
            View and manage incidents across all your bots
          </p>
        </div>
        <Button variant="outline" onClick={() => refreshIncidents()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="error">Errors</SelectItem>
            <SelectItem value="warning">Warnings</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={botFilter} onValueChange={setBotFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Bot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bots</SelectItem>
            {bots.map((bot: Bot) => (
              <SelectItem key={bot.id} value={bot.id}>
                {bot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Incidents List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <IncidentsList incidents={filteredIncidents} bots={bots} />
      )}
    </div>
  )
}
