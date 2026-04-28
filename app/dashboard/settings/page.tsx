"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, Shield, LogOut, Award } from "lucide-react"
import { TierBadge, TierLegend, getTierFromDate } from "@/components/dashboard/tier-badge"

export default function SettingsPage() {
  const { user, logout } = useAuth()

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : undefined

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??"

  // Calculate tier from user's join date (falls back to current date if not available)
  const userTier = getTierFromDate(user?.joinedAt || new Date().toISOString())

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-muted-foreground">
          Manage your dashboard preferences and account
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <User className="h-5 w-5" />
          Profile
        </div>
        <Separator className="my-4" />
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={user?.username} />
            <AvatarFallback className="bg-secondary text-2xl text-secondary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-card-foreground">
                {user?.username}
              </h3>
              <TierBadge tier={userTier} showLabel size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Discord ID: {user?.id}
            </p>
          </div>
        </div>
      </div>

      {/* Membership Tier Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <Award className="h-5 w-5" />
          Membership Tier
        </div>
        <Separator className="my-4" />
        <p className="mb-4 text-sm text-muted-foreground">
          Your tier is based on how long you have been using Rx Systems. Higher tiers unlock recognition and future perks.
        </p>
        <TierLegend currentTier={userTier} />
      </div>

      {/* Notifications Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <Bell className="h-5 w-5" />
          Notifications
        </div>
        <Separator className="my-4" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Config Changes</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when bot configurations are updated
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Website Changes</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about dashboard updates, new features, and releases
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Bot Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when bots are updated or new bots are added
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Bot Downtime Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when a bot goes offline or experiences issues
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Security Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new logins and security-related events
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Creator Notices</Label>
              <p className="text-sm text-muted-foreground">
                Receive notices and announcements from the bot creator
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <Shield className="h-5 w-5" />
          Security
        </div>
        <Separator className="my-4" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                Require 2FA for Config Changes
              </Label>
              <p className="text-sm text-muted-foreground">
                Extra verification for sensitive operations
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
        <Separator className="my-4 bg-destructive/30" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-card-foreground">Log Out</p>
            <p className="text-sm text-muted-foreground">
              Sign out of your account
            </p>
          </div>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
