"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles, ArrowLeft } from "lucide-react"
import { SUBSCRIPTION_PRODUCTS, formatPrice } from "@/lib/subscription-products"

const botInfo: Record<string, { name: string; icon: string; description: string; color: string }> = {
  "syruprx-pro": {
    name: "SyrupRx PRO",
    icon: "/bots/syruprx-pro.png",
    description: "Premium features and advanced analytics for Maple Hospital servers",
    color: "from-rx-purple to-rx-orange",
  },
  mednoterx: {
    name: "MedNoteRx",
    icon: "/bots/mednoterx.png",
    description: "Discord patient charting and medical documentation",
    color: "from-emerald-500 to-teal-500",
  },
  autoclockrx: {
    name: "AutoclockRx",
    icon: "/bots/autoclockrx.png",
    description: "Automatic shift logging with MarizmaAPI integration",
    color: "from-blue-500 to-cyan-500",
  },
}

// Group products by bot
const productsByBot = SUBSCRIPTION_PRODUCTS.reduce(
  (acc, product) => {
    if (!acc[product.botId]) {
      acc[product.botId] = []
    }
    acc[product.botId].push(product)
    return acc
  },
  {} as Record<string, typeof SUBSCRIPTION_PRODUCTS>
)

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/rxsystems.png"
              alt="RX Systems"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="bg-gradient-to-r from-rx-purple to-rx-orange bg-clip-text text-lg font-semibold text-transparent">
              RX Systems
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="mb-16 text-center">
          <Badge className="mb-4 bg-rx-purple/20 text-rx-purple hover:bg-rx-purple/30">
            Premium Plans
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Unlock the full potential of your server
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Choose a plan that fits your community. All premium features are per-server subscriptions
            with no hidden fees.
          </p>
        </div>

        {/* Pricing by Bot */}
        <div className="space-y-20">
          {Object.entries(productsByBot).map(([botId, products]) => {
            const info = botInfo[botId]
            if (!info) return null

            const monthlyProduct = products.find((p) => p.interval === "month")
            const yearlyProduct = products.find((p) => p.interval === "year")

            return (
              <section key={botId} className="scroll-mt-20" id={botId}>
                {/* Bot Header */}
                <div className="mb-8 flex items-center gap-4">
                  <div className={`rounded-xl bg-gradient-to-br ${info.color} p-0.5`}>
                    <div className="rounded-[10px] bg-background p-2">
                      <Image
                        src={info.icon}
                        alt={info.name}
                        width={48}
                        height={48}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{info.name}</h2>
                    <p className="text-muted-foreground">{info.description}</p>
                  </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Monthly */}
                  {monthlyProduct && (
                    <Card className="relative border-border bg-card">
                      <CardHeader>
                        <CardTitle className="text-lg text-card-foreground">{monthlyProduct.name}</CardTitle>
                        <CardDescription>{monthlyProduct.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-6">
                          <span className="text-4xl font-bold text-foreground">
                            {formatPrice(monthlyProduct.priceInCents)}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        <ul className="space-y-3">
                          {monthlyProduct.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-3">
                              <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                              <span className="text-sm text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full" variant="outline">
                          Get Started
                        </Button>
                      </CardFooter>
                    </Card>
                  )}

                  {/* Yearly */}
                  {yearlyProduct && (
                    <Card className="relative border-rx-purple bg-card">
                      {yearlyProduct.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="gap-1 bg-gradient-to-r from-rx-purple to-rx-orange text-primary-foreground">
                            <Sparkles className="h-3 w-3" />
                            Most Popular
                          </Badge>
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-lg text-card-foreground">{yearlyProduct.name}</CardTitle>
                        <CardDescription>{yearlyProduct.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-6">
                          <span className="text-4xl font-bold text-foreground">
                            {formatPrice(yearlyProduct.priceInCents / 12)}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Billed annually ({formatPrice(yearlyProduct.priceInCents)}/year)
                          </p>
                        </div>
                        <ul className="space-y-3">
                          {yearlyProduct.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-3">
                              <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                              <span className="text-sm text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full bg-gradient-to-r from-rx-purple to-rx-orange text-primary-foreground hover:opacity-90">
                          Get Started - Save 20%
                        </Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
              </section>
            )
          })}
        </div>

        {/* FAQ Section */}
        <section className="mt-24">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <FaqCard
              question="How do subscriptions work?"
              answer="Subscriptions are per-server (guild). Each server that wants premium features needs its own subscription. You can manage multiple server subscriptions from one account."
            />
            <FaqCard
              question="Can I cancel anytime?"
              answer="Yes! You can cancel your subscription at any time. You'll retain access to premium features until the end of your billing period."
            />
            <FaqCard
              question="What payment methods do you accept?"
              answer="We accept all major credit cards, debit cards, and PayPal through our secure Stripe payment system."
            />
            <FaqCard
              question="Do you offer refunds?"
              answer="We offer a 7-day money-back guarantee for new subscriptions. If you're not satisfied, contact us for a full refund."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24 text-center">
          <div className="rounded-2xl bg-gradient-to-r from-rx-purple/10 to-rx-orange/10 px-8 py-12">
            <h2 className="text-2xl font-bold text-foreground">Ready to get started?</h2>
            <p className="mt-2 text-muted-foreground">
              Login with Discord to subscribe and start using premium features today.
            </p>
            <Link href="/">
              <Button size="lg" className="mt-6 gap-2">
                <DiscordIcon className="h-5 w-5" />
                Login with Discord
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <span className="bg-gradient-to-r from-rx-purple to-rx-orange bg-clip-text font-medium text-transparent">
            RX Systems
          </span>{" "}
          - Premium Discord bots for healthcare roleplay communities
        </div>
      </footer>
    </div>
  )
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-card-foreground">{question}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{answer}</p>
      </CardContent>
    </Card>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}
