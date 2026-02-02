"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink, Lock, Sparkles, Server, Clock, FileText, Activity } from "lucide-react"

const publicBots = [
  {
    id: "syruprx",
    name: "SyrupRx",
    description: "The ultimate utility and staff management bot for Maple Hospital servers. Track shifts, manage roles, and keep your staff organized.",
    icon: "/bots/syruprx.png",
    color: "from-rx-purple to-rx-orange",
    features: ["Shift Tracking", "Role Sync", "Staff Management", "Moderation Logs"],
    stats: { guilds: "180+", uptime: "99.9%" },
    free: true,
    hasPremium: false,
    featureIcon: Server,
  },
  {
    id: "syruprx-pro",
    name: "SyrupRx PRO",
    description: "Premium features and advanced analytics for power users. Custom branding, detailed reports, and priority support.",
    icon: "/bots/syruprx-pro.png",
    color: "from-rx-purple to-rx-orange",
    features: ["Advanced Analytics", "Custom Branding", "Priority Support", "Unlimited Commands"],
    stats: { guilds: "150+", uptime: "99.9%" },
    free: false,
    hasPremium: true,
    priceFrom: "$7.99",
    featureIcon: Sparkles,
  },
  {
    id: "autoclockrx",
    name: "AutoclockRx",
    description: "Automatic shift logging with MarizmaAPI integration. Export payroll data, monitor activity, and manage schedules effortlessly.",
    icon: "/bots/autoclockrx.png",
    color: "from-blue-500 to-cyan-500",
    features: ["Auto Clock-In/Out", "Payroll Export", "Activity Monitor", "Shift Schedules"],
    stats: { guilds: "65+", uptime: "99.5%" },
    free: false,
    hasPremium: true,
    priceFrom: "$10.39",
    featureIcon: Clock,
  },
  {
    id: "mednoterx",
    name: "MedNoteRx",
    description: "Discord-native patient charting and medical documentation. Perfect for healthcare roleplay communities and training servers.",
    icon: "/bots/mednoterx.png",
    color: "from-emerald-500 to-teal-500",
    features: ["Patient Charting", "Medical Templates", "Export to PDF", "Multi-Department"],
    stats: { guilds: "20+", uptime: "99.5%" },
    free: false,
    hasPremium: true,
    priceFrom: "$11.99",
    featureIcon: FileText,
  },
  {
    id: "swissrx",
    name: "SwissRx",
    description: "LOA management and session scheduling system. Track leaves of absence and organize training sessions with ease.",
    icon: "/bots/swissrx.png",
    color: "from-red-500 to-rose-500",
    features: ["LOA Management", "Session Calendar", "Staff Tracking", "Google Sheets Sync"],
    stats: { guilds: "Private", uptime: "99.9%" },
    free: true,
    hasPremium: false,
    isPrivate: true,
    featureIcon: Activity,
  },
]

export default function BotsPage() {
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

        {/* Bot Cards */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {publicBots.map((bot) => (
            <Card key={bot.id} className="group flex flex-col border-border bg-card transition-all hover:border-rx-purple/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`rounded-xl bg-gradient-to-br ${bot.color} p-0.5`}>
                    <div className="rounded-[10px] bg-background p-2">
                      <Image
                        src={bot.icon}
                        alt={bot.name}
                        width={48}
                        height={48}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {bot.isPrivate && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Private
                      </Badge>
                    )}
                    {bot.free && !bot.isPrivate && (
                      <Badge variant="secondary" className="bg-success/20 text-success">
                        Free
                      </Badge>
                    )}
                    {bot.hasPremium && (
                      <Badge className="gap-1 bg-gradient-to-r from-rx-purple to-rx-orange text-primary-foreground">
                        <Sparkles className="h-3 w-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="mt-4 text-xl text-card-foreground">{bot.name}</CardTitle>
                <CardDescription className="text-sm">{bot.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1">
                <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Server className="h-4 w-4" />
                    {bot.stats.guilds} servers
                  </span>
                  <span>{bot.stats.uptime} uptime</span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Features</p>
                  <div className="flex flex-wrap gap-2">
                    {bot.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-3 border-t border-border pt-4">
                {bot.hasPremium && (
                  <p className="text-sm text-muted-foreground">
                    From <span className="font-semibold text-foreground">{bot.priceFrom}</span>/month
                  </p>
                )}
                <div className="flex w-full gap-2">
                  {bot.isPrivate ? (
                    <Button disabled className="flex-1" variant="outline">
                      Private Bot
                    </Button>
                  ) : (
                    <>
                      <Button className="flex-1 gap-2" variant="outline" asChild>
                        <a
                          href={`https://discord.com/oauth2/authorize?client_id=placeholder&scope=bot+applications.commands&permissions=8`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Add to Server
                        </a>
                      </Button>
                      {bot.hasPremium && (
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
          ))}
        </div>

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
