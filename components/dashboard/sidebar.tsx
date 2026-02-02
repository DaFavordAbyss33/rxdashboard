"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Settings, AlertTriangle, Server, Bot, Crown } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/bots", label: "Bots", icon: Bot },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: Crown },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/dashboard/guilds", label: "My Guilds", icon: Server },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()

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
        {navItems.map((item) => {
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

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="text-xs text-sidebar-foreground/50">RX Systems v1.0.0</div>
      </div>
    </aside>
  )
}
