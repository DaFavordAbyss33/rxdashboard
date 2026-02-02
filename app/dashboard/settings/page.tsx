o"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, Shield, LogOut, CreditCard, ChevronRight } from "lucide-react"

export default function SettingsPage() {
  const { user, logout } = useAuth()

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : undefined

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??"

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
            <h3 className="text-lg font-semibold text-card-foreground">
              {user?.username}
            </h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Discord ID: {user?.id}
            </p>
          </div>
        </div>
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
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts for critical incidents
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Discord DM Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified via Discord DM for bot issues
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Weekly Summary</Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly summary of bot activity
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </div>

      {/* Integrations Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <CreditCard className="h-5 w-5" />
          Integrations
        </div>
        <Separator className="my-4" />
        <Link href="/dashboard/settings/stripe-setup">
          <div className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rx-purple/20 to-rx-orange/20">
                <CreditCard className="h-5 w-5 text-rx-purple" />
              </div>
              <div>
                <p className="font-medium text-card-foreground">Stripe Webhook Setup</p>
                <p className="text-sm text-muted-foreground">
                  Configure webhooks for subscription billing
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* Security Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <Shield className="h-5 w-5" />
          Security
        </div>
        <Separator className="my-4" />
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">
              Master User IDs
            </Label>
            <Input
              placeholder="Enter Discord user IDs (comma separated)"
              defaultValue={user?.id}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Users who can manage all bots regardless of guild permissions
            </p>
          </div>
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
