import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
}

export function StatsCard({ title, value, icon: Icon, trend, trendUp }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold text-card-foreground">{value}</p>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs",
              trendUp === true
                ? "text-online"
                : trendUp === false
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}
          >
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}
