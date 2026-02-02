"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Copy, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BOT_WEBHOOK_CONFIG } from "@/lib/subscription-products"
import { bots } from "@/lib/data"

export default function StripeSetupPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const premiumBots = bots.filter((bot) => bot.hasSubscription)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stripe Integration Setup</h1>
          <p className="text-muted-foreground">Configure webhooks for each subscription bot</p>
        </div>
      </div>

      {/* Environment Variables Section */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            Environment Variables
          </CardTitle>
          <CardDescription>Add these environment variables to your Vercel project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Required variables (add via the Vars section in the sidebar):
            </p>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex items-center justify-between rounded bg-background p-2">
                <code>STRIPE_SECRET_KEY</code>
                <Badge variant="outline">From Stripe Dashboard</Badge>
              </div>
              <div className="flex items-center justify-between rounded bg-background p-2">
                <code>STRIPE_PUBLISHABLE_KEY</code>
                <Badge variant="outline">From Stripe Dashboard</Badge>
              </div>
              <div className="flex items-center justify-between rounded bg-background p-2">
                <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>
                <Badge variant="outline">Same as above</Badge>
              </div>
              {premiumBots.map((bot) => {
                const config = BOT_WEBHOOK_CONFIG[bot.id]
                return config ? (
                  <div key={bot.id} className="flex items-center justify-between rounded bg-background p-2">
                    <code>{config.secretEnvVar}</code>
                    <Badge variant="outline">From webhook setup below</Badge>
                  </div>
                ) : null
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Setup Section */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            Create Webhooks in Stripe
          </CardTitle>
          <CardDescription>Create a separate webhook for each bot in your Stripe Dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {premiumBots.map((bot) => {
            const config = BOT_WEBHOOK_CONFIG[bot.id]
            if (!config) return null

            const webhookUrl = `${baseUrl}${config.endpoint}`

            return (
              <div key={bot.id} className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <img src={bot.icon || "/placeholder.svg"} alt={bot.name} className="h-10 w-10 rounded-lg" />
                  <div>
                    <h4 className="font-semibold text-foreground">{bot.name}</h4>
                    <p className="text-sm text-muted-foreground">Webhook endpoint for {bot.name} subscriptions</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Webhook URL</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-background p-2 text-sm">{webhookUrl}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(webhookUrl, `${bot.id}-url`)}
                      >
                        {copiedId === `${bot.id}-url` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Environment Variable Name
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-background p-2 text-sm">{config.secretEnvVar}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(config.secretEnvVar, `${bot.id}-env`)}
                      >
                        {copiedId === `${bot.id}-env` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Events to listen for</label>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "checkout.session.completed",
                        "customer.subscription.updated",
                        "customer.subscription.deleted",
                        "invoice.payment_succeeded",
                        "invoice.payment_failed",
                      ].map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Step by Step Instructions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              3
            </span>
            Step-by-Step Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                1
              </span>
              <div>
                <p className="font-medium text-foreground">Go to Stripe Dashboard</p>
                <p className="text-muted-foreground">
                  Navigate to{" "}
                  <a
                    href="https://dashboard.stripe.com/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Developers → Webhooks
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                2
              </span>
              <div>
                <p className="font-medium text-foreground">Add endpoint</p>
                <p className="text-muted-foreground">
                  Click "Add endpoint" and paste the webhook URL for each bot
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                3
              </span>
              <div>
                <p className="font-medium text-foreground">Select events</p>
                <p className="text-muted-foreground">
                  Select the events listed above for each webhook endpoint
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                4
              </span>
              <div>
                <p className="font-medium text-foreground">Copy signing secret</p>
                <p className="text-muted-foreground">
                  After creating, click on the webhook and copy the "Signing secret" - this is your webhook secret
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                5
              </span>
              <div>
                <p className="font-medium text-foreground">Add to environment variables</p>
                <p className="text-muted-foreground">
                  Add each signing secret to your Vercel project using the corresponding environment variable name
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-warning/50 bg-warning/10">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Important: Database Integration Required</p>
            <p className="mt-1 text-muted-foreground">
              The webhook handlers have TODO comments where you need to add database persistence. 
              Without a database, subscription status won't persist between sessions. Consider adding 
              Supabase or another database to store subscription records.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-3">
        <a
          href="https://dashboard.stripe.com/webhooks"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Stripe Webhooks
          </Button>
        </a>
        <a
          href="https://dashboard.stripe.com/apikeys"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Stripe API Keys
          </Button>
        </a>
        <Link href="/dashboard/subscriptions">
          <Button>View Subscriptions</Button>
        </Link>
      </div>
    </div>
  )
}
