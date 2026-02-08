"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Webhook,
  RefreshCw,
  Trash2,
  ExternalLink,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Hash,
  ScrollText,
  ArrowDownToLine,
  Info,
} from "lucide-react"
import { toast } from "sonner"

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

interface LogEntry {
  id: string
  type: string
  title: string
  action: string
  command: string | null
  player: string | null
  playerId: string | null
  playerProfileUrl: string | null
  target: string | null
  targetId: string | null
  targetProfileUrl: string | null
  message: string | null
  server: string | null
  embedColor: number | null
  timestamp: string
}

export function WebhookTab({ guildId }: WebhookTabProps) {
  const [channelId, setChannelId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [logSearch, setLogSearch] = useState("")
  const [logPage, setLogPage] = useState(1)
  const [logType, setLogType] = useState("")

  // Fetch webhook config
  const {
    data: webhookData,
    isLoading: webhookLoading,
    mutate: refreshWebhook,
  } = useSWR(`/api/webhooks/rx?guildId=${guildId}`, fetcher)

  // Fetch logs
  const {
    data: logsData,
    isLoading: logsLoading,
    mutate: refreshLogs,
  } = useSWR(
    webhookData?.webhook
      ? `/api/webhooks/rx/logs?guildId=${guildId}&page=${logPage}&limit=25${logType ? `&type=${logType}` : ""}${logSearch ? `&search=${encodeURIComponent(logSearch)}` : ""}`
      : null,
    fetcher,
    { refreshInterval: 30000 }
  )

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
        refreshLogs()
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

  const getTypeColor = useCallback((type: string) => {
    switch (type.toLowerCase()) {
      case "command": return "bg-primary/20 text-primary"
      case "moderation": return "bg-destructive/20 text-destructive"
      case "admin": return "bg-warning/20 text-warning"
      case "system": return "bg-blue-500/20 text-blue-400"
      case "join": return "bg-online/20 text-online"
      case "leave": return "bg-muted text-muted-foreground"
      default: return "bg-secondary text-secondary-foreground"
    }
  }, [])

  if (webhookLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
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
          The bot will read messages from that channel and display them here.
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
                  <li>The SyrupRx bot will read command logs from the channel and display them here</li>
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

          <Separator />

          {/* Logs Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-medium text-card-foreground">Command Logs</h4>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refreshLogs()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value)
                    setLogPage(1)
                  }}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1">
                {["", "command", "moderation", "admin", "system"].map((t) => (
                  <Button
                    key={t}
                    variant={logType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setLogType(t)
                      setLogPage(1)
                    }}
                  >
                    {t === "" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Log Entries */}
            <div className="rounded-lg border border-border">
              {logsLoading ? (
                <div className="space-y-0">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-3 border-b border-border p-3 last:border-b-0">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : logsData?.logs && logsData.logs.length > 0 ? (
                <div>
                  {logsData.logs.map((log: LogEntry) => (
                    <div
                      key={log.id}
                      className="border-b border-border px-4 py-3 last:border-b-0 hover:bg-secondary/20"
                    >
                      <div className="flex items-start gap-3">
                        {/* Color bar matching embed color */}
                        <div
                          className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
                          style={{
                            backgroundColor: log.embedColor
                              ? `#${log.embedColor.toString(16).padStart(6, "0")}`
                              : "hsl(var(--primary))",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          {/* Title & Time row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-card-foreground">
                                {log.title}
                              </span>
                              <Badge className={`text-[10px] ${getTypeColor(log.type)}`}>
                                {log.type}
                              </Badge>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {/* Player & Command info */}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {log.player && (
                              <span>
                                {log.playerProfileUrl ? (
                                  <a
                                    href={log.playerProfileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-primary font-medium hover:underline"
                                  >
                                    {log.player}
                                    {log.playerId && <span className="text-muted-foreground">:{log.playerId}</span>}
                                    <ExternalLink className="ml-0.5 h-3 w-3" />
                                  </a>
                                ) : (
                                  <>
                                    <span className="text-primary font-medium">{log.player}</span>
                                    {log.playerId && <span className="text-muted-foreground">:{log.playerId}</span>}
                                  </>
                                )}
                                {log.command && (
                                  <span>
                                    {" ran "}
                                    <code className="rounded bg-secondary px-1 py-0.5 font-mono text-card-foreground">
                                      {log.command}
                                    </code>
                                  </span>
                                )}
                              </span>
                            )}
                            {!log.player && log.command && (
                              <span>
                                {"Command: "}
                                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-card-foreground">
                                  {log.command}
                                </code>
                              </span>
                            )}
                          </div>
                          {/* Message/Details */}
                          {log.message && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {log.message}
                            </p>
                          )}
                          {/* Footer: target, server */}
                          {(log.target || log.server) && (
                            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                              {log.target && (
                                <span>
                                  {"Target: "}
                                  {log.targetProfileUrl ? (
                                    <a
                                      href={log.targetProfileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 text-card-foreground hover:text-primary hover:underline"
                                    >
                                      {log.target}
                                      {log.targetId && <>:{log.targetId}</>}
                                      <ExternalLink className="ml-0.5 h-2.5 w-2.5" />
                                    </a>
                                  ) : (
                                    <span className="text-card-foreground">{log.target}</span>
                                  )}
                                </span>
                              )}
                              {log.server && (
                                <span>Server: <span className="text-card-foreground">{log.server}</span></span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <ScrollText className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {logSearch || logType ? "No logs match your filters" : "No logs synced yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {!logSearch && !logType && "Click \"Sync Now\" above to pull command logs from Discord."}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {logsData?.pagination && logsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {logsData.pagination.page} of {logsData.pagination.totalPages} ({logsData.pagination.total} total logs)
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={logPage <= 1}
                    onClick={() => setLogPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={logPage >= logsData.pagination.totalPages}
                    onClick={() => setLogPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
