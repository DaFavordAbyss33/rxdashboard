"use client"

import { useState } from "react"
import { incidents, bots } from "@/lib/data"
import { IncidentsList } from "@/components/dashboard/incidents-list"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"

export default function IncidentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [botFilter, setBotFilter] = useState<string>("all")

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch = incident.message
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || incident.type === typeFilter
    const matchesBot = botFilter === "all" || incident.botId === botFilter
    return matchesSearch && matchesType && matchesBot
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Incidents</h2>
        <p className="mt-1 text-muted-foreground">
          View and manage incidents across all your bots
        </p>
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
            {bots.map((bot) => (
              <SelectItem key={bot.id} value={bot.id}>
                {bot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Incidents List */}
      <IncidentsList incidents={filteredIncidents} />
    </div>
  )
}
