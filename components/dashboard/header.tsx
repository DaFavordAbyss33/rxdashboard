"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, LogOut, User } from "lucide-react"
import { NotificationsPanel } from "@/components/dashboard/notifications-panel"
import { TierBadge, getTierFromDate } from "@/components/dashboard/tier-badge"

// Demo join date - in production, pull from user session/database
const DEMO_JOIN_DATE = "2025-06-15T10:30:00Z"

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : undefined

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??"

  // Calculate tier from join date
  const userTier = getTierFromDate(DEMO_JOIN_DATE)

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          <span className="bg-gradient-to-r from-rx-purple to-rx-orange bg-clip-text text-transparent">
            RX
          </span>{" "}
          Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rx-orange text-[10px] font-medium text-foreground">
              3
            </span>
          </Button>
          <NotificationsPanel
            open={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={user?.username} />
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline-block">
                {user?.username}
              </span>
              <TierBadge tier={userTier} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
