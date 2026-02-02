"use client"

import Link from "next/link"
import Image from "next/image"
import type { Bot } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot as BotIcon, Server, Clock, Zap, ArrowRight, Lock, Crown } from "lucide-react"

interface BotStatusCardProps {
  bot: Bot
  installedCount: number
}

export function BotStatusCard({ bot, installedCount }: BotStatusCardProps) {
  const statusColors = {
    online: "bg-online",
    offline: "bg-offline",
    degraded: "bg-degraded",
  }

  const statusLabels = {
    online: "Online",
    offline: "Offline",
    degraded: "Degraded",
  }

  return (
    <div className="group relative rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
      {/* Status indicator */}
      <div className="absolute right-4 top-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              statusColors[bot.status]
            )}
          />
          <span className="text-xs text-muted-foreground">
            {statusLabels[bot.status]}
          </span>
        </div>
      </div>

      {/* Bot Icon & Name */}
      <div className="mb-4 flex items-center gap-3">
        <Image
          src={bot.icon || "/placeholder.svg"}
          alt={bot.name}
          width={48}
          height={48}
          className="rounded-lg"
        />
        <div>
          <h4 className="font-semibold text-card-foreground">{bot.name}</h4>
          <p className="text-xs text-muted-foreground">{bot.description}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-secondary/50 p-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Server className="h-3 w-3" />
            Guilds
          </div>
          <div className="mt-0.5 text-sm font-semibold text-card-foreground">
            {bot.guildsCount}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            Ping
          </div>
          <div className="mt-0.5 text-sm font-semibold text-card-foreground">
            {bot.status === "offline" ? "-" : `${bot.wsPing}ms`}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Uptime
          </div>
          <div className="mt-0.5 text-sm font-semibold text-card-foreground">
            {bot.uptime.split(" ")[0]}
          </div>
        </div>
      </div>

      {/* Capabilities badges */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {bot.isPrivate && (
          <Badge variant="secondary" className="text-xs">
            <Lock className="mr-1 h-3 w-3" />
            Private
          </Badge>
        )}
        {bot.hasSubscription && (
          <Badge className="bg-gradient-to-r from-rx-purple/20 to-rx-orange/20 text-rx-purple text-xs">
            <Crown className="mr-1 h-3 w-3" />
            Subscription
          </Badge>
        )}
        {bot.capabilities.features?.slice(0, 2).map((feature) => (
          <Badge key={feature} variant="secondary" className="text-xs">
            {feature}
          </Badge>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button asChild variant="default" size="sm" className="flex-1">
          <Link href={`/dashboard/bots/${bot.id}`}>
            Manage
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/bots/${bot.id}`}>
            {installedCount} installed
          </Link>
        </Button>
      </div>

      {/* Last incident indicator */}
      {bot.lastIncident && (
        <div className="mt-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
          <p className="text-xs text-destructive">
            {bot.lastIncident.message}
          </p>
        </div>
      )}
    </div>
  )
}
