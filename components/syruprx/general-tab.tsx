"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
  Users,
  RefreshCw,
  Power,
  Megaphone,
  Flag,
  UserX,
  Ban,
  Settings,
  Clock,
  Search,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Loader2,
  AlertTriangle,
  Server,
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface SyrupRxGeneralTabProps {
  guildId: string
}

interface ServerInfo {
  name?: string
  description?: string
  owner?: string
  admins?: string[]
  playerCount?: number
  maxPlayers?: number
  hideFromList?: boolean
  private?: boolean
  minLevel?: number
  banner?: string
}

interface Player {
  userId: number
  username: string
  displayName?: string
}

interface BannedUser {
  userId: number
  username?: string
}

export function SyrupRxGeneralTab({ guildId }: SyrupRxGeneralTabProps) {
  // Server data fetching
  const { data: serverInfoData, isLoading: serverInfoLoading, mutate: refreshServerInfo } = useSWR(
    `/api/bots/syruprx/marizma?guildId=${guildId}&action=serverinfo`,
    fetcher,
    { refreshInterval: 30000 }
  )
  const { data: playersData, isLoading: playersLoading, mutate: refreshPlayers } = useSWR(
    `/api/bots/syruprx/marizma?guildId=${guildId}&action=players`,
    fetcher,
    { refreshInterval: 15000 }
  )
  const { data: queueData, isLoading: queueLoading, mutate: refreshQueue } = useSWR(
    `/api/bots/syruprx/marizma?guildId=${guildId}&action=queue`,
    fetcher,
    { refreshInterval: 15000 }
  )
  const { data: bansData, isLoading: bansLoading, mutate: refreshBans } = useSWR(
    `/api/bots/syruprx/marizma?guildId=${guildId}&action=bans`,
    fetcher
  )

  // Action states
  const [isExecuting, setIsExecuting] = useState<string | null>(null)
  
  // Form states
  const [announceMessage, setAnnounceMessage] = useState("")
  const [kickUserId, setKickUserId] = useState("")
  const [kickReason, setKickReason] = useState("")
  const [banUserId, setBanUserId] = useState("")
  const [bannerText, setBannerText] = useState("")
  const [hideFromList, setHideFromList] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [minLevel, setMinLevel] = useState("")
  const [banSearch, setBanSearch] = useState("")

  // Roblox headshots cache
  const [headshots, setHeadshots] = useState<Record<number, string>>({})

  // Load Roblox headshots for banned users
  const loadHeadshots = async (userIds: number[]) => {
    if (userIds.length === 0) return
    
    const missingIds = userIds.filter(id => !headshots[id])
    if (missingIds.length === 0) return

    try {
      const response = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${missingIds.join(",")}&size=48x48&format=Png&isCircular=false`
      )
      const data = await response.json()
      
      const newHeadshots: Record<number, string> = {}
      for (const item of data.data || []) {
        if (item.imageUrl) {
          newHeadshots[item.targetId] = item.imageUrl
        }
      }
      
      setHeadshots(prev => ({ ...prev, ...newHeadshots }))
    } catch (error) {
      console.error("Failed to load headshots:", error)
    }
  }

  // Load headshots when bans data changes
  if (bansData?.success && bansData.data?.bans) {
    const banUserIds = bansData.data.bans.map((b: BannedUser) => b.userId)
    loadHeadshots(banUserIds)
  }

  const executeAction = async (action: string, params: Record<string, unknown>) => {
    setIsExecuting(action)
    try {
      const response = await fetch("/api/bots/syruprx/marizma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, action, ...params }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message || `${action} executed successfully`)
        
        // Refresh relevant data
        if (action === "kick" || action === "ban") {
          refreshPlayers()
          refreshBans()
        } else if (action === "settings" || action === "banner") {
          refreshServerInfo()
        }
        
        // Clear forms
        if (action === "announce") setAnnounceMessage("")
        if (action === "kick") { setKickUserId(""); setKickReason("") }
        if (action === "ban") setBanUserId("")
        if (action === "banner") setBannerText("")
      } else {
        toast.error(data.error || `Failed to execute ${action}`)
      }
    } catch (error) {
      toast.error(`Network error executing ${action}`)
    } finally {
      setIsExecuting(null)
    }
  }

  const serverInfo: ServerInfo = serverInfoData?.data || {}
  const players: Player[] = playersData?.data?.players || []
  const queue: Player[] = queueData?.data?.queue || []
  const bans: BannedUser[] = bansData?.data?.bans || []

  const filteredBans = bans.filter(ban => 
    banSearch === "" || 
    ban.userId.toString().includes(banSearch) ||
    ban.username?.toLowerCase().includes(banSearch.toLowerCase())
  )

  const isConfigured = serverInfoData?.success !== false || !serverInfoData?.error?.includes("not configured")

  if (!isConfigured && serverInfoData?.error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <div>
          <h3 className="text-lg font-semibold">API Not Configured</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Please configure your Marizma API key in the Setup tab first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Server Info Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">
              Server Dashboard
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              View server info and execute actions on your Maple server
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshServerInfo()
              refreshPlayers()
              refreshQueue()
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
        </div>
      </div>
      <Separator />

      {/* Server Info Card */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex items-start gap-3">
          <Server className="mt-0.5 h-5 w-5 text-primary" />
          <div className="flex-1">
            <h4 className="font-medium text-card-foreground">Server Information</h4>
            {serverInfoLoading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : serverInfoData?.success ? (
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{serverInfo.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Owner:</span>{" "}
                  <span className="font-medium">{serverInfo.owner || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Players:</span>{" "}
                  <span className="font-medium">
                    {serverInfo.playerCount ?? 0}/{serverInfo.maxPlayers ?? "?"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={serverInfo.private ? "secondary" : "default"}>
                    {serverInfo.private ? "Private" : "Public"}
                  </Badge>
                  {serverInfo.hideFromList && (
                    <Badge variant="outline">Hidden</Badge>
                  )}
                </div>
                {serverInfo.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description:</span>{" "}
                    <span>{serverInfo.description}</span>
                  </div>
                )}
                {serverInfo.banner && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Banner:</span>{" "}
                    <span className="italic">{serverInfo.banner}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-destructive">
                {serverInfoData?.error || "Failed to load server info"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Players & Queue Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Players */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-card-foreground">
                Current Players ({players.length})
              </h4>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refreshPlayers()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 max-h-48 overflow-y-auto">
            {playersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : players.length > 0 ? (
              <div className="space-y-1">
                {players.map((player) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-secondary/50"
                  >
                    <span>{player.displayName || player.username}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {player.userId}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No players online
              </p>
            )}
          </div>
        </div>

        {/* Server Queue */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-card-foreground">
                Queue ({queue.length})
              </h4>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refreshQueue()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 max-h-48 overflow-y-auto">
            {queueLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : queue.length > 0 ? (
              <div className="space-y-1">
                {queue.map((player, index) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-secondary/50"
                  >
                    <span>
                      <span className="text-muted-foreground">#{index + 1}</span>{" "}
                      {player.displayName || player.username}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {player.userId}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Queue is empty
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Actions Section */}
      <div>
        <h4 className="mb-4 text-sm font-medium text-card-foreground">Server Actions</h4>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Announce */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="h-5 w-5 text-primary" />
              <Label className="font-medium">Announce</Label>
            </div>
            <Textarea
              placeholder="Enter announcement message..."
              value={announceMessage}
              onChange={(e) => setAnnounceMessage(e.target.value)}
              rows={2}
              className="mb-3"
            />
            <Button
              onClick={() => executeAction("announce", { message: announceMessage })}
              disabled={!announceMessage.trim() || isExecuting === "announce"}
              className="w-full"
            >
              {isExecuting === "announce" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Announcement
            </Button>
          </div>

          {/* Kick Player */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserX className="h-5 w-5 text-primary" />
              <Label className="font-medium">Kick Player</Label>
            </div>
            <Input
              placeholder="Roblox User ID or Username"
              value={kickUserId}
              onChange={(e) => setKickUserId(e.target.value)}
              className="mb-2"
            />
            <Input
              placeholder="Reason (optional)"
              value={kickReason}
              onChange={(e) => setKickReason(e.target.value)}
              className="mb-3"
            />
            <Button
              onClick={() => executeAction("kick", { userId: kickUserId, reason: kickReason })}
              disabled={!kickUserId.trim() || isExecuting === "kick"}
              variant="secondary"
              className="w-full"
            >
              {isExecuting === "kick" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kick Player
            </Button>
          </div>

          {/* Ban Player */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Ban className="h-5 w-5 text-primary" />
              <Label className="font-medium">Ban Player</Label>
            </div>
            <Input
              placeholder="Roblox User ID or Username"
              value={banUserId}
              onChange={(e) => setBanUserId(e.target.value)}
              className="mb-3"
            />
            <Button
              onClick={() => executeAction("ban", { userId: banUserId, banned: true })}
              disabled={!banUserId.trim() || isExecuting === "ban"}
              variant="destructive"
              className="w-full"
            >
              {isExecuting === "ban" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ban Player
            </Button>
          </div>

          {/* Set Banner */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flag className="h-5 w-5 text-primary" />
              <Label className="font-medium">Set Banner</Label>
            </div>
            <Input
              placeholder="Enter banner text..."
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              className="mb-3"
            />
            <Button
              onClick={() => executeAction("banner", { text: bannerText })}
              disabled={!bannerText.trim() || isExecuting === "banner"}
              variant="secondary"
              className="w-full"
            >
              {isExecuting === "banner" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Banner
            </Button>
          </div>
        </div>
      </div>

      {/* Server Settings */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <Label className="font-medium">Server Settings</Label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              {hideFromList ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="text-sm">Hide from List</span>
            </div>
            <Switch checked={hideFromList} onCheckedChange={setHideFromList} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              <span className="text-sm">Private</span>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min Level"
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <Button
          onClick={() => executeAction("settings", { 
            hideFromList, 
            private: isPrivate, 
            minLevel: minLevel ? parseInt(minLevel) : undefined 
          })}
          disabled={isExecuting === "settings"}
          className="mt-4"
        >
          {isExecuting === "settings" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Settings
        </Button>
      </div>

      {/* Shutdown Section */}
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Power className="h-5 w-5 text-destructive" />
            <div>
              <Label className="font-medium text-destructive">Shutdown Server</Label>
              <p className="text-sm text-muted-foreground">
                This will immediately shut down the Maple game server
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isExecuting === "shutdown"}>
                {isExecuting === "shutdown" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Shutdown
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will immediately shut down the Maple game server. All players will be disconnected. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => executeAction("shutdown", {})}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Shutdown Server
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* Server Bans Section */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-card-foreground">
              Server Bans ({bans.length})
            </h4>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refreshBans()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by User ID or username..."
            value={banSearch}
            onChange={(e) => setBanSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-64 overflow-y-auto">
          {bansLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredBans.length > 0 ? (
            <div className="space-y-2">
              {filteredBans.map((ban) => (
                <div
                  key={ban.userId}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-secondary">
                      {headshots[ban.userId] ? (
                        <Image
                          src={headshots[ban.userId]}
                          alt={ban.username || `User ${ban.userId}`}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Users className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {ban.username || `User ${ban.userId}`}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        ID: {ban.userId}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => executeAction("ban", { userId: ban.userId, banned: false })}
                    disabled={isExecuting === "ban"}
                  >
                    {isExecuting === "ban" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revoke Ban
                  </Button>
                </div>
              ))}
            </div>
          ) : bans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No banned players
            </p>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No results found for "{banSearch}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
