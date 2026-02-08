"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Settings, AlertTriangle, Server, Bot, Crown, Shield, Gavel } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { TierCard, getTierFromDate } from "@/components/dashboard/tier-badge"

// Demo join date - in production, pull from user session/database
const DEMO_JOIN_DATE = "2025-06-15T10:30:00Z"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, adminOnly: true },
  { href: "/dashboard/bots", label: "Bots", icon: Bot, adminOnly: false },
  { href: "/dashboard/moderation", label: "Moderation", icon: Gavel, adminOnly: false },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: Crown, adminOnly: false },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle, adminOnly: false },
  { href: "/dashboard/guilds", label: "My Guilds", icon: Server, adminOnly: false },
  { href: "/dashboard/admin", label: "Admin Panel", icon: Shield, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, adminOnly: false },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()

  const userTier = getTierFromDate(DEMO_JOIN_DATE)

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <Image
          src="/images/rxsystems.png"
          alt="RX Systems"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <span className="bg-gradient-to-r from-rx-purple to-rx-orange bg-clip-text font-semibold text-transparent">
          RX Systems
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Tier Card */}
      <div className="px-4 pb-3">
        <TierCard tier={userTier} joinDate={DEMO_JOIN_DATE} />
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="text-xs text-sidebar-foreground/50">RX Systems v1.0.0</div>
      </div>
    </aside>
  )
}
