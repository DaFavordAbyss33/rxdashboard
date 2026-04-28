"use client"

import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ExternalLink, Server, RefreshCw, Wifi, WifiOff, Terminal } from "lucide-react"
import { SYRUPRX_COMMANDS, getCommandCount } from "@/lib/data"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function BotsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/bots/public", fetcher, {
    refreshInterval: 60000, // Refresh every minute for public page
  })

  const bot = data?.bots?.[0] || null
  const commandCount = getCommandCount()

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
              SyrupRx
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
            Free Bot
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            SyrupRx - Maple Hospital Bot
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            The ultimate utility and staff management bot for Maple Hospital servers.
            Manage your game server, track staff, and keep your community organized.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-96 rounded-lg" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 flex items-center justify-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm text-yellow-600">
            <WifiOff className="h-4 w-4" />
            Unable to fetch live data. Showing cached information.
          </div>
        )}

        {/* Bot Card */}
        {!isLoading && (
          <div className="mx-auto max-w-2xl">
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-gradient-to-br from-rx-purple to-rx-orange p-0.5">
                    <div className="rounded-[10px] bg-background p-2">
                      <Image
                        src="/bots/syruprx.png"
                        alt="SyrupRx"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`gap-1 ${
                      bot?.status === "online" 
                        ? "bg-success/20 text-success" 
                        : bot?.status === "degraded"
                        ? "bg-yellow-500/20 text-yellow-600"
                        : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {bot?.status === "online" ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    {bot?.status === "online" ? "Online" : bot?.status === "degraded" ? "Degraded" : "Offline"}
                  </Badge>
                </div>
                <CardTitle className="mt-4 text-2xl text-card-foreground">SyrupRx</CardTitle>
                <CardDescription className="text-base">
                  Maple Hospital utility and staff management bot. Features server management,
                  staff logging, pager system, auto replies, and more.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    {bot?.guildsCount?.toLocaleString() || 0} servers
                  </span>
                  <span className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    {commandCount} commands
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Features</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Server Management",
                      "Staff Logging",
                      "Pager System",
                      "Auto Replies",
                      "Auto Announcements",
                      "Moderation Logs",
                      "Marizma Integration",
                    ].map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="border-t border-border pt-4">
                <div className="flex w-full gap-3">
                  {bot?.clientId ? (
                    <Button className="flex-1 gap-2 bg-gradient-to-r from-rx-purple to-rx-orange text-white hover:opacity-90" asChild>
                      <a
                        href={`https://discord.com/oauth2/authorize?client_id=${bot.clientId}&scope=bot+applications.commands&permissions=8`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Add to Server
                      </a>
                    </Button>
                  ) : (
                    <Button className="flex-1 gap-2 bg-gradient-to-r from-rx-purple to-rx-orange text-white hover:opacity-90" asChild>
                      <Link href="/dashboard">
                        <ExternalLink className="h-4 w-4" />
                        Login to Invite
                      </Link>
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Commands Section */}
        <section className="mt-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Commands ({commandCount})
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(SYRUPRX_COMMANDS).map(([categoryId, category]) => (
              <Card key={categoryId} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-card-foreground">{category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.commands.map((command) => (
                      <li key={command.name} className="text-sm">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-rx-purple">
                          /{command.name}
                        </code>
                        <p className="mt-0.5 text-muted-foreground">{command.description}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

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
            <h2 className="text-2xl font-bold text-foreground">Need help or have questions?</h2>
            <p className="mt-2 text-muted-foreground">
              Join our Discord server for support and updates.
            </p>
            <Button size="lg" className="mt-6" variant="outline">
              Join Support Server
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <span className="bg-gradient-to-r from-rx-purple to-rx-orange bg-clip-text font-medium text-transparent">
            SyrupRx
          </span>{" "}
          - Free Discord bot for Maple Hospital communities
        </div>
      </footer>
    </div>
  )
}
