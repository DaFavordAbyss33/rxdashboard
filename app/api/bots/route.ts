import { NextResponse } from "next/server"
import { getAllBotsStatus, type BotId } from "@/lib/discord"
import { getGuildStats, getSubscriptionStats, BOT_DATABASES } from "@/lib/mongodb"
import Stripe from "stripe"

// Only initialize Stripe if the key is actually set
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

// Bot metadata that doesn't come from APIs
const BOT_METADATA: Record<BotId, {
  name: string
  description: string
  icon: string
  clientId: string
  inviteScopes: string[]
  permissionsInt: string
  capabilities: {
    channels?: string[]
    keys?: string[]
    features?: string[]
    premium?: boolean
  }
  hasSubscription?: boolean
  isPrivate?: boolean
  stripeProductId?: string
}> = {
  syruprx: {
    name: "SyrupRx",
    description: "Maple Hospital utility and staff management bot",
    icon: "/bots/syruprx.png",
    clientId: process.env.DISCORD_CLIENT_ID_SYRUPRX || "1234567890123456789",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["staffLogs", "modLogs", "shiftLogs"],
      keys: ["marizmaApiKey", "robloxGroupId"],
      features: ["shiftTracker", "roleSync", "moderation"],
      premium: true,
    },
  },
  "syruprx-pro": {
    name: "SyrupRx PRO",
    description: "Premium features and advanced analytics",
    icon: "/bots/syruprx-pro.png",
    clientId: process.env.DISCORD_CLIENT_ID_SYRUPRX_PRO || "1122334455667788990",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["analyticsChannel", "premiumLogs"],
      keys: ["stripeCustomerId", "analyticsKey"],
      features: ["premiumGate", "analytics", "customBranding"],
      premium: true,
    },
    hasSubscription: true,
    stripeProductId: process.env.STRIPE_PRODUCT_SYRUPRX_PRO,
  },
  autoclockrx: {
    name: "AutoclockRx",
    description: "Automatic shift logging with MarizmaAPI",
    icon: "/bots/autoclockrx.png",
    clientId: process.env.DISCORD_CLIENT_ID_AUTOCLOCKRX || "1357924680135792468",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["clockChannel", "reportChannel"],
      keys: ["robloxGroupId", "marizmaApiKey", "payrollWebhook"],
      features: ["autoClock", "payrollExport", "activityMonitor", "shiftSchedules"],
      premium: true,
    },
    hasSubscription: true,
    stripeProductId: process.env.STRIPE_PRODUCT_AUTOCLOCKRX,
  },
  mednoterx: {
    name: "MedNoteRx",
    description: "Discord patient charting and medical documentation",
    icon: "/bots/mednoterx.png",
    clientId: process.env.DISCORD_CLIENT_ID_MEDNOTERX || "2468135790246813579",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["alertChannel", "logChannel", "chartingChannel"],
      keys: ["webhookUrl", "emrApiKey"],
      features: ["patientCharting", "alerts", "scheduling", "exportReports"],
      premium: true,
    },
    hasSubscription: true,
    stripeProductId: process.env.STRIPE_PRODUCT_MEDNOTERX,
  },
  swissrx: {
    name: "SwissRx",
    description: "LOA and session management system",
    icon: "/bots/swissrx.png",
    clientId: process.env.DISCORD_CLIENT_ID_SWISSRX || "9876543210987654321",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["loaChannel", "sessionChannel", "staffLog"],
      keys: ["googleSheetsId"],
      features: ["loa", "sessionCalendar", "staffTracking"],
      premium: false,
    },
    isPrivate: true,
  },
}

export async function GET() {
  try {
    const botIds = Object.keys(BOT_DATABASES) as BotId[]

    // Fetch all sources in parallel -- each wrapped so one failure doesn't break everything
    const [discordStatuses, mongoStats, stripeSubscriptions] = await Promise.all([
      getAllBotsStatus().catch((err) => {
        console.error("[bots] Discord status fetch failed:", err)
        return [] as Awaited<ReturnType<typeof getAllBotsStatus>>
      }),
      Promise.all(botIds.map(async (botId) => {
        const [guildStats, subStats] = await Promise.all([
          getGuildStats(botId),
          getSubscriptionStats(botId),
        ])
        return { botId, guildStats, subStats }
      })),
      stripe
        ? stripe.subscriptions.list({ status: "all", limit: 100 }).catch((err) => {
            console.error("[bots] Stripe subscriptions fetch failed:", err)
            return { data: [] } as Stripe.Response<Stripe.ApiList<Stripe.Subscription>>
          })
        : Promise.resolve({ data: [] } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Subscription>>),
    ])

    // Build combined bot data
    const bots = botIds.map((botId) => {
      const metadata = BOT_METADATA[botId]
      const discordStatus = discordStatuses.find((s) => s.botId === botId)
      const mongoData = mongoStats.find((s) => s.botId === botId)
      
      // Count Stripe subscriptions for this bot's product
      const productSubscriptions = metadata.stripeProductId
        ? stripeSubscriptions.data.filter((sub) =>
            sub.items.data.some((item) => 
              item.price.product === metadata.stripeProductId
            )
          )
        : []
      
      const activeSubscriptions = productSubscriptions.filter(
        (sub) => sub.status === "active" || sub.status === "trialing"
      ).length

      // Determine status based on Discord API response
      let status: "online" | "offline" | "degraded" = "offline"
      if (discordStatus?.online) {
        status = "online"
      }

      // Use Discord guild count if available, otherwise MongoDB
      const guildsCount = discordStatus?.guildsCount || 
        mongoData?.guildStats.totalGuilds || 
        0

      return {
        id: botId,
        name: metadata.name,
        description: metadata.description,
        icon: metadata.icon,
        clientId: metadata.clientId,
        inviteScopes: metadata.inviteScopes,
        permissionsInt: metadata.permissionsInt,
        capabilities: metadata.capabilities,
        status,
        guildsCount,
        wsPing: 0, // Not available via REST API
        uptime: "N/A", // Would need to track this separately
        hasSubscription: metadata.hasSubscription,
        isPrivate: metadata.isPrivate,
        // Additional real-time data
        activeSubscriptions,
        totalSubscriptions: productSubscriptions.length,
        mongoConnected: mongoData?.guildStats.connected ?? false,
        discordConnected: discordStatus?.online ?? false,
      }
    })

    return NextResponse.json({
      bots,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch bots data:", error)
    return NextResponse.json(
      { error: "Failed to fetch bots data" },
      { status: 500 }
    )
  }
}
