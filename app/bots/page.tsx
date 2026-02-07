"use client"

import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ExternalLink, Lock, Sparkles, Server, Clock, FileText, Activity, RefreshCw, Wifi, WifiOff } from "lucide-react"

// Static metadata for each bot that doesn't change
const BOT_METADATA: Record<string, {
  color: string
  features: string[]
  free: boolean
  hasPremium: boolean
  priceFrom?: string
  featureIcon: typeof Server
  longDescription: string
  name: string
  description: string
  icon: string
  isPrivate?: boolean
}> = {
  syruprx: {
    name: "SyrupRx",
    description: "Maple Hospital utility and staff management bot",
    icon: "/bots/syruprx.png",
    color: "from-rx-purple to-rx-orange",
    features: ["Shift Tracking", "Role Sync", "Staff Management", "Moderation Logs"],
    free: true,
    hasPremium: false,
    featureIcon: Server,
    longDescription: "The ultimate utility and staff management bot for Maple Hospital servers. Track shifts, manage roles, and keep your staff organized.",
  },
  "syruprx-pro": {
    name: "SyrupRx PRO",
    description: "Premium features and advanced analytics",
    icon: "/bots/syruprx-pro.png",
    color: "from-rx-purple to-rx-orange",
    features: ["Advanced Analytics", "Custom Branding", "Priority Support", "Unlimited Commands"],
    free: false,
    hasPremium: true,
    priceFrom: "$7.99",
    featureIcon: Sparkles,
    longDescription: "Premium features and advanced analytics for power users. Custom branding, detailed reports, and priority support.",
  },
  autoclockrx: {
    name: "AutoclockRx",
    description: "Automatic shift logging with MarizmaAPI",
    icon: "/bots/autoclockrx.png",
    color: "from-blue-500 to-cyan-500",
    features: ["Auto Clock-In/Out", "Payroll Export", "Activity Monitor", "Shift Schedules"],
    free: false,
    hasPremium: true,
    priceFrom: "$10.39",
    featureIcon: Clock,
    longDescription: "Automatic shift logging with MarizmaAPI integration. Export payroll data, monitor activity, and manage schedules effortlessly.",
  },
  mednoterx: {
    name: "MedNoteRx",
    description: "Discord patient charting and medical documentation",
    icon: "/bots/mednoterx.png",
    color: "from-emerald-500 to-teal-500",
    features: ["Patient Charting", "Medical Templates", "Export to PDF", "Multi-Department"],
    free: false,
    hasPremium: true,
    priceFrom: "$11.99",
    featureIcon: FileText,
    longDescription: "Discord-native patient charting and medical documentation. Perfect for healthcare roleplay communities and training servers.",
  },
  swissrx: {
    name: "SwissRx",
    description: "LOA and session management system",
    icon: "/bots/swissrx.png",
    color: "from-red-500 to-rose-500",
    features: ["LOA Management", "Session Calendar", "Staff Tracking", "Google Sheets Sync"],
    free: true,
    hasPremium: false,
    featureIcon: Activity,
    longDescription: "LOA management and session scheduling system. Track leaves of absence and organize training sessions with ease.",
    isPrivate: true,
  },
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Fallback bot list when API is unavailable
const FALLBACK_BOTS = Object.entries(BOT_METADATA).map(([id, meta]) => ({
  id,
  name: meta.name,
  description: meta.description,
  icon: meta.icon,
  clientId: "", // Will use invite links without client ID check
  status: "offline" as const,
  guildsCount: 0,
  isPrivate: meta.isPrivate || false,
  hasSubscription: meta.hasPremium,
}))

export default function BotsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/bots/public", fetcher, {
    refreshInterval: 60000, // Refresh every minute for public page
  })

  // Use fetched bots if available, otherwise use fallback static data
  const bots = data?.bots?.length > 0 ? data.bots : (error || !data ? FALLBACK_BOTS : [])
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
            <Link href="/pricing">
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
            </Link>
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
            Our Bots
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Powerful bots for your Discord server
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            From staff management to medical documentation, we have a bot for every need in your
            healthcare roleplay community.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-lg" />
            ))}
          </div>
        )}

        {/* Error State - Show static data */}
        {error && (
          <div className="mb-8 flex items-center justify-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm text-yellow-600">
            <WifiOff className="h-4 w-4" />
            Unable to fetch live data. Showing cached information.
          </div>
        )}

        {/* Bot Cards */}
        {!isLoading && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot: any) => {
              const metadata = BOT_METADATA[bot.id] || {}
              return (
                <Card key={bot.id} className="group flex flex-col border-border bg-card transition-all hover:border-rx-purple/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`rounded-xl bg-gradient-to-br ${metadata.color || "from-gray-500 to-gray-600"} p-0.5`}>
                        <div className="rounded-[10px] bg-background p-2">
                          <Image
                            src={bot.icon || "/placeholder.svg"}
                            alt={bot.name}
                            width={48}
                            height={48}
                            className="rounded-lg"
                            style={{ width: "auto", height: "auto" }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {/* Live Status Indicator */}
                        <Badge 
                          variant="secondary" 
                          className={`gap-1 ${
                            bot.status === "online" 
                              ? "bg-success/20 text-success" 
                              : bot.status === "degraded"
                              ? "bg-yellow-500/20 text-yellow-600"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {bot.status === "online" ? (
                            <Wifi className="h-3 w-3" />
                          ) : (
                            <WifiOff className="h-3 w-3" />
                          )}
                          {bot.status === "online" ? "Online" : bot.status === "degraded" ? "Degraded" : "Offline"}
                        </Badge>
                        {bot.isPrivate && (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Private
                          </Badge>
                        )}
                        {metadata.hasPremium && (
                          <Badge className="gap-1 bg-gradient-to-r from-rx-purple to-rx-orange text-primary-foreground">
                            <Sparkles className="h-3 w-3" />
                            Premium
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="mt-4 text-xl text-card-foreground">{bot.name}</CardTitle>
                    <CardDescription className="text-sm">{metadata.longDescription || bot.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1">
                    <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Server className="h-4 w-4" />
                        {bot.guildsCount?.toLocaleString() || 0} servers
                      </span>
                      {bot.activeSubscriptions > 0 && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-rx-purple" />
                          {bot.activeSubscriptions} premium
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {(metadata.features || bot.capabilities?.features || []).map((feature: string) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex flex-col gap-3 border-t border-border pt-4">
                    {metadata.hasPremium && metadata.priceFrom && (
                      <p className="text-sm text-muted-foreground">
                        From <span className="font-semibold text-foreground">{metadata.priceFrom}</span>/month
                      </p>
                    )}
                    <div className="flex w-full gap-2">
                      {bot.isPrivate || metadata.isPrivate ? (
                        <Button disabled className="flex-1" variant="outline">
                          Private Bot
                        </Button>
                      ) : bot.clientId ? (
                        <>
                          <Button className="flex-1 gap-2" variant="outline" asChild>
                            <a
                              href={`https://discord.com/oauth2/authorize?client_id=${bot.clientId}&scope=bot+applications.commands&permissions=8`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Add to Server
                            </a>
                          </Button>
                          {metadata.hasPremium && (
                            <Link href={`/pricing#${bot.id}`}>
                              <Button className="bg-gradient-to-r from-rx-purple to-rx-orange text-primary-foreground hover:opacity-90">
                                Upgrade
                              </Button>
                            </Link>
                          )}
                        </>
                      ) : (
                        <>
                          <Button className="flex-1 gap-2" variant="outline" asChild>
                            <Link href="/dashboard">
                              <ExternalLink className="h-4 w-4" />
                              Login to Invite
                            </Link>
                          </Button>
                          {metadata.hasPremium && (
                            <Link href={`/pricing#${bot.id}`}>
                              <Button className="bg-gradient-to-r from-rx-purple to-rx-orange text-primary-foreground hover:opacity-90">
                                Upgrade
                              </Button>
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Live Data Indicator */}
        {data?.timestamp && (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
            Live data - Last updated: {new Date(data.timestamp).toLocaleTimeString()}
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => mutate()}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* CTA */}
        <section className="mt-24 text-center">
          <div className="rounded-2xl bg-gradient-to-r from-rx-purple/10 to-rx-orange/10 px-8 py-12">
            <h2 className="text-2xl font-bold text-foreground">Need a custom solution?</h2>
            <p className="mt-2 text-muted-foreground">
              Contact us for custom bot development or enterprise solutions.
            </p>
            <Button size="lg" className="mt-6" variant="outline">
              Contact Us
            </Button>
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
