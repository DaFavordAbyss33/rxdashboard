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
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Link2,
  ScrollText,
} from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface WebhookTabProps {
  guildId: string
}

interface WebhookConfig {
  id: string
  guildId: string
  rxWebhookUrl: string
  discordWebhookUrl: string | null
  hasDiscordWebhook: boolean
  enabled: boolean
  createdAt: string
  lastUsedAt: string | null
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
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [showRxUrl, setShowRxUrl] = useState(false)
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
    { refreshInterval: 15000 }
  )

  const webhook: WebhookConfig | null = webhookData?.webhook || null

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/webhooks/rx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId,
          discordWebhookUrl: discordWebhookUrl || undefined,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || "Webhook generated successfully!")
        refreshWebhook()
        setShowRxUrl(true) // Show the URL immediately after generation
      } else {
        toast.error(data.error || "Failed to generate webhook")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdateDiscordUrl = async () => {
    if (!webhook) return
    setIsUpdating(true)
    try {
      const response = await fetch("/api/webhooks/rx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId,
          discordWebhookUrl: discordWebhookUrl || "",
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Discord webhook URL updated!")
        refreshWebhook()
      } else {
        toast.error(data.error || "Failed to update Discord webhook URL")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsUpdating(false)
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
        toast.success(enabled ? "Webhook enabled" : "Webhook disabled")
        refreshWebhook()
      } else {
        toast.error(data.error || "Failed to update webhook")
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
        toast.success("Webhook deleted successfully")
        refreshWebhook()
        setDiscordWebhookUrl("")
      } else {
        toast.error(data.error || "Failed to delete webhook")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/webhooks/rx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Webhook URL regenerated! Update the URL in your Maple server.")
        refreshWebhook()
        setShowRxUrl(true)
      } else {
        toast.error(data.error || "Failed to regenerate webhook")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrl(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopiedUrl(false), 2000)
    })
  }, [])

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "command": return "bg-primary/20 text-primary"
      case "moderation": return "bg-destructive/20 text-destructive"
      case "admin": return "bg-warning/20 text-warning"
      case "system": return "bg-blue-500/20 text-blue-400"
      case "join": return "bg-online/20 text-online"
      case "leave": return "bg-muted text-muted-foreground"
      default: return "bg-secondary text-secondary-foreground"
    }
  }

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
          Webhook Configuration
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate an RX Webhook URL for your Maple Hospital server to send command logs to the dashboard.
          Optionally link a Discord webhook to also push logs to a Discord channel.
        </p>
      </div>
      <Separator />

      {/* Webhook Not Created Yet */}
      {!webhook && (
        <div className="space-y-6">
          {/* Discord Webhook URL (optional) */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-sm font-medium">Discord Webhook URL</Label>
                  <p className="text-sm text-muted-foreground">
                    Optional. Logs will also be pushed to this Discord channel webhook.
                  </p>
                </div>
                <Input
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You can add or change this later.
                </p>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
                <Webhook className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-card-foreground">
                  Generate RX Webhook URL
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a unique webhook URL to put into your Maple Hospital server for command logging.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Webhook className="mr-2 h-4 w-4" />
                    Generate Webhook URL
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Exists */}
      {webhook && (
        <div className="space-y-6">
          {/* Status & Controls */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${webhook.enabled ? "bg-online" : "bg-offline"}`} />
              <div>
                <span className="text-sm font-medium text-card-foreground">
                  Webhook {webhook.enabled ? "Active" : "Disabled"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {webhook.totalLogs} log{webhook.totalLogs !== 1 ? "s" : ""} received
                  {webhook.lastUsedAt && (
                    <> &middot; Last used {new Date(webhook.lastUsedAt).toLocaleString()}</>
                  )}
                </p>
              </div>
            </div>
            <Switch
              checked={webhook.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          {/* RX Webhook URL */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Webhook className="mt-0.5 h-5 w-5 text-primary" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-sm font-medium text-primary">RX Webhook URL</Label>
                  <p className="text-sm text-muted-foreground">
                    Put this URL into your Maple Hospital server for command logs.
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      readOnly
                      value={showRxUrl ? webhook.rxWebhookUrl : "••••••••••••••••••••••••••••••••"}
                      className="pr-10 font-mono text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowRxUrl(!showRxUrl)}
                    title={showRxUrl ? "Hide URL" : "Show URL"}
                  >
                    {showRxUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhook.rxWebhookUrl)}
                    title="Copy URL"
                  >
                    {copiedUrl ? <Check className="h-4 w-4 text-online" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-500">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Keep this URL secret. Anyone with this URL can send logs to your dashboard.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Discord Webhook URL */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-sm font-medium">Discord Webhook URL</Label>
                  <p className="text-sm text-muted-foreground">
                    Optional. Logs will also be pushed to this Discord channel.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={webhook.hasDiscordWebhook ? "Enter new URL to update..." : "https://discord.com/api/webhooks/..."}
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleUpdateDiscordUrl}
                    disabled={isUpdating || !discordWebhookUrl}
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {webhook.hasDiscordWebhook ? "Update" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Status:{" "}
                  <Badge variant={webhook.hasDiscordWebhook ? "default" : "secondary"} className="text-xs">
                    {webhook.hasDiscordWebhook ? "Connected" : "Not Set"}
                  </Badge>
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-destructive">Danger Zone</h4>
            <div className="flex flex-wrap gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate URL
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate Webhook URL?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create a new webhook URL and invalidate the old one.
                      You will need to update the URL in your Maple Hospital server.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRegenerate} disabled={isGenerating}>
                      {isGenerating ? "Regenerating..." : "Regenerate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Webhook
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the webhook and its URL.
                      Existing logs will be preserved but no new logs will be received.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
                  {/* Log Entries - Card layout for Discord embed data */}
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
                    {logSearch || logType ? "No logs match your filters" : "No logs received yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {!logSearch && !logType && "Logs will appear here when your Maple server sends data to the webhook URL."}
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
