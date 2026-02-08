"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Trash2,
  Loader2,
  Hash,
  ScrollText,
  ArrowDownToLine,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface WebhookTabProps {
  guildId: string
}

interface WebhookConfig {
  id: string
  guildId: string
  channelId: string
  enabled: boolean
  createdAt: string
  lastSyncedAt: string | null
  totalLogs: number
}

export function WebhookTab({ guildId }: WebhookTabProps) {
  const [channelId, setChannelId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch webhook config
  const {
    data: webhookData,
    isLoading: webhookLoading,
    mutate: refreshWebhook,
  } = useSWR(`/api/webhooks/rx?guildId=${guildId}`, fetcher)

  const webhook: WebhookConfig | null = webhookData?.webhook || null

  const handleSaveChannel = async () => {
    if (!channelId) {
      toast.error("Please enter a Discord channel ID")
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch("/api/webhooks/rx", {
        method: webhook ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, channelId }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || "Channel saved!")
        refreshWebhook()
        setChannelId("")
      } else {
        toast.error(data.error || "Failed to save channel")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/webhooks/rx/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || `Synced ${data.synced} logs`)
        refreshWebhook()
      } else {
        toast.error(data.error || "Failed to sync logs")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!webhook) return
    try {
      const response = await fetch("/api/webhooks/rx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, enabled }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(enabled ? "Sync enabled" : "Sync disabled")
        refreshWebhook()
      } else {
        toast.error(data.error || "Failed to update")
      }
    } catch {
      toast.error("Network error")
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/webhooks/rx?guildId=${guildId}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Webhook configuration deleted")
        refreshWebhook()
        setChannelId("")
      } else {
        toast.error(data.error || "Failed to delete")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsDeleting(false)
    }
  }

  if (webhookLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-card-foreground">
          Command Log Sync
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect a Discord channel where Maple Hospital posts command logs.
          The bot will read messages from that channel and sync them to the audit log.
        </p>
      </div>
      <Separator />

      {/* Channel Not Set Yet */}
      {!webhook && (
        <div className="space-y-6">
          {/* How it works */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-card-foreground">How it works</p>
                <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Create a Discord webhook in a channel in your server</li>
                  <li>Add that Discord webhook URL to your Maple Hospital game settings</li>
                  <li>Enter the <strong className="text-card-foreground">channel ID</strong> of that same channel below</li>
                  <li>The SyrupRx bot will read command logs from the channel and sync them to the unified audit log</li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  Make sure the SyrupRx bot has <strong className="text-card-foreground">Read Message History</strong> permission in the channel.
                </p>
              </div>
            </div>
          </div>

          {/* Channel ID Input */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
                <Hash className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-card-foreground">
                  Connect Log Channel
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the Discord channel ID where the Maple webhook posts command logs.
                </p>
              </div>
              <div className="flex w-full max-w-md gap-2">
                <Input
                  placeholder="e.g. 1234567890123456789"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value.replace(/\D/g, ""))}
                  className="font-mono"
                />
                <Button
                  onClick={handleSaveChannel}
                  disabled={isSaving || !channelId}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Right-click the channel in Discord and select "Copy Channel ID" (requires Developer Mode).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Channel Connected */}
      {webhook && (
        <div className="space-y-6">
          {/* Status & Controls */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${webhook.enabled ? "bg-online" : "bg-offline"}`} />
              <div>
                <span className="text-sm font-medium text-card-foreground">
                  Sync {webhook.enabled ? "Active" : "Disabled"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {webhook.totalLogs} log{webhook.totalLogs !== 1 ? "s" : ""} synced
                  {webhook.lastSyncedAt && (
                    <> &middot; Last synced {new Date(webhook.lastSyncedAt).toLocaleString()}</>
                  )}
                </p>
              </div>
            </div>
            <Switch
              checked={webhook.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          {/* Connected Channel */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-5 w-5 text-primary" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-sm font-medium text-primary">Log Channel</Label>
                  <p className="text-sm text-muted-foreground">
                    Reading command logs from this Discord channel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded-md bg-secondary px-3 py-1.5 font-mono text-sm text-card-foreground">
                    {webhook.channelId}
                  </code>
                </div>
                {/* Change channel */}
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Enter new channel ID to update..."
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveChannel}
                    disabled={isSaving || !channelId}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Button */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-3">
              <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Pull Latest Logs</p>
                <p className="text-xs text-muted-foreground">
                  Fetch new messages from the Discord channel and parse command logs.
                </p>
              </div>
            </div>
            <Button
              onClick={handleSync}
              disabled={isSyncing || !webhook.enabled}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </div>

          {/* View Logs Note */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <ScrollText className="mt-0.5 h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-card-foreground">
                  Logs moved to Audit Log
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Webhook command logs are now integrated with the unified Audit Log in the Moderation panel. 
                  Use the "Webhook" filter to see only webhook-sourced entries.
                </p>
                <Link
                  href="/dashboard/moderation"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  Go to Moderation Audit Log
                </Link>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-destructive">Danger Zone</h4>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Channel Connection
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Channel Connection?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disconnect the log channel. Existing logs will be preserved but no new logs will be synced.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Removing..." : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  )
}
