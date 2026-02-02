import { NextResponse } from "next/server"
import { getAllBotsStatus } from "@/lib/discord"
import { getGuildStats, getSubscriptionStats, BOT_DATABASES, type BotId } from "@/lib/mongodb"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET() {
  try {
    const botIds = Object.keys(BOT_DATABASES) as BotId[]

    // Fetch all data in parallel
    const [discordStatuses, mongoData, stripeBalance, stripeSubscriptions] = await Promise.all([
      getAllBotsStatus(),
      Promise.all(botIds.map(async (botId) => {
        const [guildStats, subStats] = await Promise.all([
          getGuildStats(botId),
          getSubscriptionStats(botId),
        ])
        return { botId, guildStats, subStats }
      })),
      stripe.balance.retrieve(),
      stripe.subscriptions.list({ status: "active", limit: 100 }),
    ])

    // Calculate stats
    const onlineBots = discordStatuses.filter((s) => s.online).length
    const totalBots = botIds.length
    
    const totalGuilds = discordStatuses.reduce((acc, s) => acc + (s.guildsCount || 0), 0) ||
      mongoData.reduce((acc, s) => acc + (s.guildStats.totalGuilds || 0), 0)
    
    const totalActiveSubscriptions = stripeSubscriptions.data.length
    
    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = stripeSubscriptions.data.reduce((acc, sub) => {
      const item = sub.items.data[0]
      if (!item?.price?.unit_amount) return acc
      
      const amount = item.price.unit_amount / 100 // Convert from cents
      const interval = item.price.recurring?.interval
      
      // Normalize to monthly
      if (interval === "year") {
        return acc + (amount / 12)
      }
      return acc + amount
    }, 0)

    // Get available balance
    const availableBalance = stripeBalance.available.reduce(
      (acc, b) => acc + b.amount,
      0
    ) / 100

    const pendingBalance = stripeBalance.pending.reduce(
      (acc, b) => acc + b.amount,
      0
    ) / 100

    return NextResponse.json({
      bots: {
        online: onlineBots,
        total: totalBots,
        allOnline: onlineBots === totalBots,
      },
      guilds: {
        total: totalGuilds,
      },
      subscriptions: {
        active: totalActiveSubscriptions,
      },
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        available: availableBalance,
        pending: pendingBalance,
        currency: "usd",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
