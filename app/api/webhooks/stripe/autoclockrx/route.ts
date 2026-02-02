import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"

const BOT_ID = "autoclockrx"
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET_AUTOCLOCKRX!

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature provided" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[AutoclockRx Webhook] Signature verification failed:`, message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  console.log(`[AutoclockRx Webhook] Received event: ${event.type}`)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.botId === BOT_ID) {
          await handleSubscriptionCreated(session)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.metadata?.botId === BOT_ID) {
          await handleSubscriptionUpdated(subscription)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.metadata?.botId === BOT_ID) {
          await handleSubscriptionCancelled(subscription)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          if (subscription.metadata?.botId === BOT_ID) {
            await handlePaymentSucceeded(invoice, subscription)
          }
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          if (subscription.metadata?.botId === BOT_ID) {
            await handlePaymentFailed(invoice, subscription)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error(`[AutoclockRx Webhook] Error processing event:`, err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

// ============================================================================
// AutoclockRx Subscription Handlers
// ============================================================================

async function handleSubscriptionCreated(session: Stripe.Checkout.Session) {
  const { guildId, guildName, userId, productId } = session.metadata || {}

  console.log(`[AutoclockRx] New subscription created:`, {
    guildId,
    guildName,
    userId,
    productId,
    customerId: session.customer,
    subscriptionId: session.subscription,
  })

  // TODO: Save subscription to your database
  // await db.subscriptions.create({
  //   botId: BOT_ID,
  //   guildId,
  //   guildName,
  //   userId,
  //   productId,
  //   stripeCustomerId: session.customer,
  //   stripeSubscriptionId: session.subscription,
  //   status: 'active',
  // })

  // TODO: Call your Discord bot API to grant premium access
  // This enables premium features like:
  // - Automatic shift logging
  // - MarizmaAPI integration
  // - Payroll export
  // - Custom shift schedules
  // await fetch('https://your-bot-api.com/api/autoclockrx/premium/grant', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${process.env.AUTOCLOCKRX_API_KEY}` },
  //   body: JSON.stringify({ guildId, userId }),
  // })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { guildId, userId } = subscription.metadata || {}

  console.log(`[AutoclockRx] Subscription updated:`, {
    subscriptionId: subscription.id,
    guildId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })

  // TODO: Update subscription status in your database
  // await db.subscriptions.update({
  //   where: { stripeSubscriptionId: subscription.id },
  //   data: {
  //     status: subscription.status,
  //     cancelAtPeriodEnd: subscription.cancel_at_period_end,
  //     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  //   },
  // })
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const { guildId, userId } = subscription.metadata || {}

  console.log(`[AutoclockRx] Subscription cancelled:`, {
    subscriptionId: subscription.id,
    guildId,
  })

  // TODO: Mark subscription as cancelled in your database
  // await db.subscriptions.update({
  //   where: { stripeSubscriptionId: subscription.id },
  //   data: { status: 'cancelled' },
  // })

  // TODO: Call your Discord bot API to revoke premium access
  // await fetch('https://your-bot-api.com/api/autoclockrx/premium/revoke', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${process.env.AUTOCLOCKRX_API_KEY}` },
  //   body: JSON.stringify({ guildId, userId }),
  // })
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription
) {
  const { guildId } = subscription.metadata || {}

  console.log(`[AutoclockRx] Payment succeeded:`, {
    invoiceId: invoice.id,
    guildId,
    amount: invoice.amount_paid,
  })

  // TODO: Record payment in your database
  // TODO: Send confirmation to Discord channel
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription
) {
  const { guildId, userId } = subscription.metadata || {}

  console.log(`[AutoclockRx] Payment failed:`, {
    invoiceId: invoice.id,
    guildId,
    attemptCount: invoice.attempt_count,
  })

  // TODO: Notify user about failed payment
  // TODO: Send warning to Discord channel
}
