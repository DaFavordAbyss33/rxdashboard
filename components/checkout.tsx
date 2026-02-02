"use client"

import { useCallback } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { startSubscriptionCheckout } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface SubscriptionCheckoutProps {
  productId: string
  guildId: string
  guildName: string
  userId: string
}

export default function SubscriptionCheckout({
  productId,
  guildId,
  guildName,
  userId,
}: SubscriptionCheckoutProps) {
  const fetchClientSecret = useCallback(
    () => startSubscriptionCheckout(productId, guildId, guildName, userId),
    [productId, guildId, guildName, userId]
  )

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
