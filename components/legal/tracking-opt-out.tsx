"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Users, MessageSquare, ShieldAlert, Info } from "lucide-react"

interface TrackingPreference {
  key: string
  label: string
  description: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
  enabled: boolean
}

export function TrackingOptOut() {
  const [preferences, setPreferences] = useState<TrackingPreference[]>([
    {
      key: "presence",
      label: "Presence Intent",
      description: "Online status and activity tracking",
      detail:
        "When disabled, bots will not be able to see your online/offline/idle/DND status or your current activity. Presence-aware dashboards and status-based notifications will not include your data.",
      icon: Eye,
      enabled: true,
    },
    {
      key: "members",
      label: "Server Members Intent",
      description: "Member list and role tracking",
      detail:
        "When disabled, bots will not track your join/leave events, role changes, or nickname updates. Permission-based features may still function using cached data. Audit logging for your account will be limited.",
      icon: Users,
      enabled: true,
    },
    {
      key: "messages",
      label: "Message Content Intent",
      description: "Reading message content for triggers and logging",
      detail:
        "When disabled, bots will not read or process the content of your messages. Keyword triggers, structured logging, and chat-based automation will not apply to your messages. Slash commands will continue to work normally.",
      icon: MessageSquare,
      enabled: true,
    },
  ])

  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const togglePreference = (key: string) => {
    setSaved(false)
    setPreferences((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p))
    )
  }

  const disableAll = () => {
    setSaved(false)
    setPreferences((prev) => prev.map((p) => ({ ...p, enabled: false })))
  }

  const enableAll = () => {
    setSaved(false)
    setPreferences((prev) => prev.map((p) => ({ ...p, enabled: true })))
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate saving - in production this would call an API
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSaved(true)
    setSaving(false)
  }

  const allDisabled = preferences.every((p) => !p.enabled)
  const allEnabled = preferences.every((p) => p.enabled)

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex gap-3 rounded-lg border border-border bg-secondary/30 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-card-foreground">Individual Tracking Preferences</p>
          <p>
            Control which Discord privileged intents Rx Systems bots can use for your account. Disabling an intent means
            bots will not access that data for you specifically. Some features may be limited as a result.
          </p>
          <p className="text-xs">
            Note: These preferences apply to your Discord user ID across all servers using Rx Systems bots. You must be
            logged in to save changes.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={disableAll} disabled={allDisabled} className="gap-2">
          <EyeOff className="h-3.5 w-3.5" />
          Disable All Tracking
        </Button>
        <Button variant="outline" size="sm" onClick={enableAll} disabled={allEnabled} className="gap-2">
          <Eye className="h-3.5 w-3.5" />
          Enable All
        </Button>
      </div>

      {/* Individual toggles */}
      <div className="space-y-3">
        {preferences.map((pref) => {
          const Icon = pref.icon
          return (
            <div
              key={pref.key}
              className="rounded-lg border border-border bg-card p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-card-foreground">{pref.label}</span>
                      <Badge
                        variant="outline"
                        className={
                          pref.enabled
                            ? "border-online/30 bg-online/10 text-online text-xs"
                            : "border-destructive/30 bg-destructive/10 text-destructive text-xs"
                        }
                      >
                        {pref.enabled ? "Active" : "Opted Out"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{pref.description}</p>
                    <p className="text-xs text-muted-foreground/70">{pref.detail}</p>
                  </div>
                </div>
                <Switch checked={pref.enabled} onCheckedChange={() => togglePreference(pref.key)} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Warning when all disabled */}
      {allDisabled && (
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-destructive">All tracking disabled</p>
            <p className="text-muted-foreground">
              Rx Systems bots will have very limited functionality for your account. Features like presence dashboards,
              role-based actions, keyword triggers, and logging will not include your data.
            </p>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || saved} className="gap-2">
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Saving...
            </>
          ) : saved ? (
            "Preferences Saved"
          ) : (
            "Save Preferences"
          )}
        </Button>
        {saved && <span className="text-xs text-online">Your tracking preferences have been updated.</span>}
      </div>
    </div>
  )
}
