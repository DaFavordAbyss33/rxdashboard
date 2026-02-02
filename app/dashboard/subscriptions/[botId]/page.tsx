"use client"

import { use, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, Crown, ArrowLeft, Server, Sparkles } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { bots, guilds, installations } from "@/lib/data"
import { getProductsByBotId, formatPrice, type SubscriptionProduct } from "@/lib/subscription-products"
import SubscriptionCheckout from "@/components/checkout"

export default function BotSubscriptionPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  const { botId } = use(params)
  const { user } = useAuth()
  const router = useRouter()

  const [selectedGuild, setSelectedGuild] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<SubscriptionProduct | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)

  const bot = bots.find((b) => b.id === botId)
  const products = getProductsByBotId(botId)

  if (!bot) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-xl font-semibold text-foreground">Bot not found</h1>
        <Link href="/dashboard/subscriptions">
          <Button variant="outline" className="mt-4 bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subscriptions
          </Button>
        </Link>
      </div>
    )
  }

  // Get guilds with this bot installed
  const installedGuildIds = installations.filter((i) => i.botId === botId).map((i) => i.guildId)
  const installedGuilds = guilds.filter((g) => installedGuildIds.includes(g.id))

  // Mock subscription status (in real app, fetch from Stripe)
  const mockSubscriptions: Record<string, { active: boolean; productId?: string; expiresAt?: Date }> = {
    "guild-1": { active: true, productId: products[1]?.id, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  }

  const handleSubscribe = (guild: (typeof guilds)[0], product: SubscriptionProduct) => {
    setSelectedGuild(guild.id)
    setSelectedProduct(product)
    setShowCheckout(true)
  }

  const monthlyProduct = products.find((p) => p.interval === "month")
  const yearlyProduct = products.find((p) => p.interval === "year")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/subscriptions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Image
            src={bot.icon || "/placeholder.svg"}
            alt={bot.name}
            width={56}
            height={56}
            className="rounded-xl"
          />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              {bot.name}
              <Crown className="h-5 w-5 text-rx-orange" />
            </h1>
            <p className="text-muted-foreground">{bot.description}</p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Plan */}
        {monthlyProduct && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Monthly Plan</CardTitle>
              <CardDescription>Flexible month-to-month billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-4xl font-bold text-foreground">
                  {formatPrice(monthlyProduct.priceInCents)}
                </span>
                <span className="text-muted-foreground">/month per server</span>
              </div>
              <ul className="space-y-2">
                {monthlyProduct.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Yearly Plan */}
        {yearlyProduct && (
          <Card className="relative border-rx-purple bg-card ring-2 ring-rx-purple">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-rx-purple to-rx-orange text-white">
                Save 20%
              </Badge>
            </div>
            <CardHeader>
              <CardTitle>Yearly Plan</CardTitle>
              <CardDescription>Best value - save 2 months</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-4xl font-bold text-foreground">
                  {formatPrice(yearlyProduct.priceInCents)}
                </span>
                <span className="text-muted-foreground">/year per server</span>
                <p className="text-sm text-muted-foreground">
                  ({formatPrice(Math.round(yearlyProduct.priceInCents / 12))}/month)
                </p>
              </div>
              <ul className="space-y-2">
                {yearlyProduct.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Servers Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Your Servers</h2>
        {installedGuilds.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Server className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">No servers found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Install {bot.name} on a server to subscribe to premium features
              </p>
              <Link href={`/dashboard/bots/${bot.id}`}>
                <Button className="mt-4 bg-transparent" variant="outline">
                  Install {bot.name}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {installedGuilds.map((guild) => {
              const subscription = mockSubscriptions[guild.id]
              const isSubscribed = subscription?.active

              return (
                <Card key={guild.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-lg font-semibold text-secondary-foreground">
                          {guild.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{guild.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {guild.memberCount.toLocaleString()} members
                          </p>
                        </div>
                      </div>
                      {isSubscribed && (
                        <Badge variant="outline" className="border-success text-success">
                          <Sparkles className="mr-1 h-3 w-3" />
                          Premium
                        </Badge>
                      )}
                    </div>

                    {isSubscribed ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Renews on {subscription.expiresAt?.toLocaleDateString()}
                        </p>
                        <Button variant="outline" size="sm" className="w-full bg-transparent">
                          Manage Subscription
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {monthlyProduct && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSubscribe(guild, monthlyProduct)}
                          >
                            Monthly
                          </Button>
                        )}
                        {yearlyProduct && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-rx-purple to-rx-orange text-white hover:opacity-90"
                            onClick={() => handleSubscribe(guild, yearlyProduct)}
                          >
                            Yearly
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Subscribe to {bot.name} - {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedGuild && guilds.find((g) => g.id === selectedGuild)?.name} -{" "}
              {selectedProduct && formatPrice(selectedProduct.priceInCents)}/{selectedProduct?.interval}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && selectedGuild && user && (
            <SubscriptionCheckout
              productId={selectedProduct.id}
              guildId={selectedGuild}
              guildName={guilds.find((g) => g.id === selectedGuild)?.name || ""}
              userId={user.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
