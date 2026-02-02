"use client"

import { bots, installations } from "@/lib/data"
import { BotStatusCard } from "@/components/dashboard/bot-status-card"

export default function BotsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your Bots</h2>
        <p className="mt-1 text-muted-foreground">
          Select a bot to manage its guilds and configuration
        </p>
      </div>

      {/* Bot Grid */}
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
  )
}
