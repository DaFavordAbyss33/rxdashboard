"use client"

import type { Incident } from "@/lib/types"
import { getBotById } from "@/lib/data"
import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface IncidentsListProps {
  incidents: Incident[]
}

export function IncidentsList({ incidents }: IncidentsListProps) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No incidents to display</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="divide-y divide-border">
        {incidents.map((incident) => {
          const bot = getBotById(incident.botId)
          const icons = {
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
          }
          const Icon = icons[incident.type]
          const colors = {
            error: "text-destructive",
            warning: "text-degraded",
            info: "text-primary",
          }

          return (
            <div key={incident.id} className="flex items-start gap-4 p-4">
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  incident.type === "error" && "bg-destructive/10",
                  incident.type === "warning" && "bg-degraded/10",
                  incident.type === "info" && "bg-primary/10"
                )}
              >
                <Icon className={cn("h-4 w-4", colors[incident.type])} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-card-foreground">
                    {bot?.name ?? incident.botId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(incident.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {incident.message}
                </p>
                {incident.stack && (
                  <pre className="mt-2 max-h-20 overflow-auto rounded bg-secondary p-2 font-mono text-xs text-muted-foreground">
                    {incident.stack}
                  </pre>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
