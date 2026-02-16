"use client"

import React from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Zap, Users, FileText, Scale, ShieldOff } from "lucide-react"
import { PrivacyPolicy } from "@/components/legal/privacy-policy"
import { TermsOfService } from "@/components/legal/terms-of-service"
import { TrackingOptOut } from "@/components/legal/tracking-opt-out"

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
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
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/bots">
              <Button variant="ghost" size="sm">
                Our Bots
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
            </Link>
            <Button onClick={login} className="gap-2">
              <DiscordIcon className="h-4 w-4" />
              Login with Discord
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Manage all your{" "}
            <span className="bg-gradient-to-r from-rx-purple to-rx-orange bg-clip-text text-transparent">
              RX Systems
            </span>{" "}
            bots in one place
          </h1>
          <p className="mt-6 text-pretty text-lg text-muted-foreground">
            A unified control panel for SyrupRx, SwissRx, AutoclockRx, MedNoteRx, and SyrupRx PRO.
            Monitor status, configure settings, and manage guilds with ease.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={login} className="gap-2">
              <DiscordIcon className="h-5 w-5" />
              Get Started
            </Button>
            <Link href="/bots">
              <Button size="lg" variant="outline">
                Explore Our Bots
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Shield}
            title="Secure Access"
            description="Discord OAuth ensures only authorized users can manage your bots and servers."
          />
          <FeatureCard
            icon={Zap}
            title="Real-time Status"
            description="Monitor bot health, latency, and incidents as they happen."
          />
          <FeatureCard
            icon={Users}
            title="Multi-Guild Support"
            description="Manage configurations across all your servers from a single dashboard."
          />
        </div>
      </main>

      {/* Legal & Privacy Section */}
      <section id="legal-section" className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Legal & Privacy
            </h2>
            <p className="mt-2 text-muted-foreground">
              Review our policies and manage your tracking preferences
            </p>
          </div>

          <Tabs defaultValue="privacy" className="w-full">
            <TabsList className="mx-auto mb-6 flex w-fit">
              <TabsTrigger value="privacy" className="gap-2 px-4">
                <FileText className="h-4 w-4" />
                Privacy Policy
              </TabsTrigger>
              <TabsTrigger value="terms" className="gap-2 px-4">
                <Scale className="h-4 w-4" />
                Terms of Service
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-2 px-4">
                <ShieldOff className="h-4 w-4" />
                Tracking Preferences
              </TabsTrigger>
            </TabsList>

            <div className="rounded-lg border border-border bg-card p-6">
              <TabsContent value="privacy">
                <PrivacyPolicy />
              </TabsContent>
              <TabsContent value="terms">
                <TermsOfService />
              </TabsContent>
              <TabsContent value="tracking">
                <TrackingOptOut />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <span className="bg-gradient-to-r from-rx-purple to-rx-orange bg-clip-text font-medium text-transparent">
            RX Systems
          </span>{" "}
          - Manage your Discord bot ecosystem
          <div className="flex gap-4 text-xs">
            <button
              onClick={() => {
                document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })
              }}
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-border">|</span>
            <button
              onClick={() => {
                document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })
              }}
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rx-purple/20 to-rx-orange/20">
        <Icon className="h-5 w-5 text-rx-purple" />
      </div>
      <h3 className="mb-2 font-semibold text-card-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}
