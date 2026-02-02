"use client"

import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, Crown, ArrowRight, Sparkles } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  SUBSCRIPTION_PRODUCTS,
  getProductsByBotId,
  formatPrice,
} from "@/lib/subscription-products"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Bot {
  id: string
  name: string
  description: string
  icon: string
  hasSubscription?: boolean
  guildsCount: number
}

export default function SubscriptionsPage() {
  const { user, managableGuilds } = useAuth()

  // Fetch bots from API
  const { data: botsData, isLoading } = useSWR("/api/bots", fetcher)

  const bots = botsData?.bots || []

  // Get all bots that have subscription tiers
  const premiumBots = bots.filter((bot: Bot) => bot.hasSubscription)

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="mt-1 text-muted-foreground">
          Manage premium subscriptions for your Discord servers
        </p>
      </div>

      {/* Premium Bots Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        {premiumBots.map((bot: Bot) => {
          const products = getProductsByBotId(bot.id)
          const monthlyProduct = products.find((p) => p.interval === "month")

          return (
            <Card
              key={bot.id}
              className="relative overflow-hidden border-border bg-card transition-all hover:border-rx-purple/50"
            >
              <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-rx-purple/10 to-transparent" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src={bot.icon || "/placeholder.svg"}
                      alt={bot.name}
                      width={48}
                      height={48}
                      className="rounded-lg"
                    />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {bot.name}
                        <Crown className="h-4 w-4 text-rx-orange" />
                      </CardTitle>
                      <CardDescription>{bot.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    {monthlyProduct ? formatPrice(monthlyProduct.priceInCents) : "$0"}
                  </span>
                  <span className="text-muted-foreground">/month per server</span>
                </div>

                <div className="space-y-2">
                  {monthlyProduct?.features.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <p className="mb-2 text-sm text-muted-foreground">
                    {bot.guildsCount} server{bot.guildsCount !== 1 ? "s" : ""} with{" "}
                    {bot.name} installed
                  </p>
                  <Link href={`/dashboard/subscriptions/${bot.id}`}>
                    <Button className="w-full bg-gradient-to-r from-rx-purple to-rx-orange text-white hover:opacity-90">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Manage Subscriptions
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* All Available Plans */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">All Premium Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SUBSCRIPTION_PRODUCTS.map((product) => {
            const bot = bots.find((b: Bot) => b.id === product.botId)
            return (
              <Card
                key={product.id}
                className={`relative border-border bg-card ${product.popular ? "ring-2 ring-rx-purple" : ""}`}
              >
                {product.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-rx-purple to-rx-orange text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {bot && (
                      <Image
                        src={bot.icon || "/placeholder.svg"}
                        alt={bot.name}
                        width={24}
                        height={24}
                        className="rounded"
                      />
                    )}
                    <CardTitle className="text-base">{product.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-foreground">
                      {formatPrice(product.priceInCents)}
                    </span>
                    <span className="text-muted-foreground">/{product.interval}</span>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {product.features.slice(0, 3).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-3 w-3 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
