import { NextResponse } from "next/server"
import { 
  isBotConfigured, 
  getSubscription,
  syncSubscription,
  cancelSubscription,
  type BotId 
} from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// Get subscription status for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const botId = searchParams.get("botId") as BotId | null
    const discordUserId = searchParams.get("discordUserId")
    const discordGuildId = searchParams.get("discordGuildId")

    if (!botId) {
      return NextResponse.json(
        { success: false, error: "Bot ID is required" },
        { status: 400 }
      )
    }

    if (!discordUserId && !discordGuildId) {
      return NextResponse.json(
        { success: false, error: "Discord User ID or Guild ID is required" },
        { status: 400 }
      )
    }

    if (!isBotConfigured(botId)) {
      return NextResponse.json({
        success: true,
        subscription: null,
        configured: false,
      })
    }

    const subscription = await getSubscription(
      botId, 
      discordUserId || undefined, 
      discordGuildId || undefined
    )

    return NextResponse.json({
      success: true,
      subscription,
      configured: true,
    })
  } catch (error) {
    console.error("Failed to fetch subscription:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscription" },
      { status: 500 }
    )
  }
}

// Create or update subscription - syncs from Stripe webhook or admin action
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      botId, 
      discordUserId, 
      discordGuildId,
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      status,
      features,
      expiresAt,
    } = body

    if (!botId || !discordUserId) {
      return NextResponse.json(
        { success: false, error: "Bot ID and Discord User ID are required" },
        { status: 400 }
      )
    }

    if (!isBotConfigured(botId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
      )
    }

    const success = await syncSubscription(botId, {
      discordUserId,
      discordGuildId,
      stripeCustomerId,
      stripeSubscriptionId,
      plan: plan || "free",
      status: status || "active",
      features: features || [],
      expiresAt,
    })

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to sync subscription" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Subscription synced to bot database",
    })
  } catch (error) {
    console.error("Failed to sync subscription:", error)
    return NextResponse.json(
      { success: false, error: "Failed to sync subscription" },
      { status: 500 }
    )
  }
}

// Cancel a subscription
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const botId = searchParams.get("botId") as BotId | null
    const discordUserId = searchParams.get("discordUserId")

    if (!botId || !discordUserId) {
      return NextResponse.json(
        { success: false, error: "Bot ID and Discord User ID are required" },
        { status: 400 }
      )
    }

    if (!isBotConfigured(botId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
      )
    }

    const success = await cancelSubscription(botId, discordUserId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to cancel subscription" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Subscription canceled",
    })
  } catch (error) {
    console.error("Failed to cancel subscription:", error)
    return NextResponse.json(
      { success: false, error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
