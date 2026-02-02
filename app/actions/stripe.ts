"use server"

import { stripe } from "@/lib/stripe"
import { getProductById, type SubscriptionProduct } from "@/lib/subscription-products"

export async function startSubscriptionCheckout(
  productId: string,
  guildId: string,
  guildName: string,
  userId: string
) {
  const product = getProductById(productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  // Create Checkout Session for subscription
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description,
            metadata: {
              botId: product.botId,
              guildId: guildId,
            },
          },
          unit_amount: product.priceInCents,
          recurring: {
            interval: product.interval,
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      botId: product.botId,
      guildId: guildId,
      guildName: guildName,
      userId: userId,
      productId: product.id,
    },
  })

  return session.client_secret
}

export async function getSubscriptionStatus(guildId: string, botId: string) {
  // Search for active subscriptions with matching metadata
  const subscriptions = await stripe.subscriptions.list({
    status: "active",
    limit: 100,
  })

  const activeSubscription = subscriptions.data.find(
    (sub) => sub.metadata.guildId === guildId && sub.metadata.botId === botId
  )

  if (activeSubscription) {
    return {
      active: true,
      subscriptionId: activeSubscription.id,
      currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
      productId: activeSubscription.metadata.productId,
    }
  }

  return { active: false }
}

export async function cancelSubscription(subscriptionId: string) {
  // Cancel at period end rather than immediately
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  return {
    success: true,
    cancelAt: new Date(subscription.cancel_at! * 1000),
  }
}

export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })

  return {
    success: true,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  }
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session.url
}

export async function getCustomerByEmail(email: string) {
  const customers = await stripe.customers.list({
    email: email,
    limit: 1,
  })

  return customers.data[0] || null
}

export async function getAllSubscriptionsForUser(userId: string) {
  // Search for all subscriptions with this userId in metadata
  const subscriptions = await stripe.subscriptions.list({
    limit: 100,
  })

  return subscriptions.data
    .filter((sub) => sub.metadata.userId === userId)
    .map((sub) => ({
      id: sub.id,
      botId: sub.metadata.botId,
      guildId: sub.metadata.guildId,
      guildName: sub.metadata.guildName,
      productId: sub.metadata.productId,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    }))
}
