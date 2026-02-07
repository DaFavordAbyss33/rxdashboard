"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shield, ExternalLink, LogOut } from "lucide-react"
import Image from "next/image"

export default function BetaWallPage() {
  const { hasBetaAccess, betaLoading, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user gains beta access, redirect to dashboard
    if (!isLoading && !betaLoading && isAuthenticated && hasBetaAccess) {
      router.push("/dashboard/bots")
    }
  }, [hasBetaAccess, betaLoading, isAuthenticated, isLoading, router])

  if (isLoading || betaLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/images/rxsystems.png"
            alt="RX Systems"
            width={48}
            height={48}
            className="rounded-xl"
          />
          <span className="bg-gradient-to-r from-rx-purple to-rx-orange bg-clip-text text-2xl font-bold text-transparent">
            RX Systems
          </span>
        </div>

        {/* Shield Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
          <Shield className="h-10 w-10 text-primary" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-balance text-2xl font-bold text-foreground">
            This Website is Currently in Beta Test
          </h1>
          <p className="text-pretty text-muted-foreground">
            Please join the Rx Systems Discord for updates on this website{"'"}s release.
          </p>
        </div>

        {/* Discord Link */}
        <Button asChild size="lg" className="gap-2">
          <a
            href="https://discord.gg/vTrNH5rNpG"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
            </svg>
            Join the Rx Systems Discord
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>

        {/* Logout option */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
