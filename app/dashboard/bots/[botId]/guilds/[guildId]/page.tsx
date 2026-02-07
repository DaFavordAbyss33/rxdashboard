"use client"

import { use, useState, useEffect, useMemo } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Bot as BotIcon,
  Server,
  Settings,
  Key,
  Hash,
  Zap,
  Crown,
  Check,
  X,
  Save,
  RefreshCw,
  AlertTriangle,
  Wrench,
  Globe,
  Shield,
  MessageSquare,
  Terminal,
  Users,
  Ban,
  Power,
  Megaphone,
  Flag,
  UserX,
  Clock,
  Info,
  Lock,
} from "lucide-react"
import { hasManageGuildPermission } from "@/lib/data"
import { toast } from "sonner"
import { SyrupRxGeneralTab } from "@/components/syruprx/general-tab"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Bot {
  id: string
  name: string
  description: string
  capabilities: {
    channels?: string[]
    keys?: string[]
    features?: string[]
    premium?: boolean
  }
  isPrivate?: boolean
}

interface GuildConfigPageProps {
  params: Promise<{ botId: string; guildId: string }>
}

export default function GuildConfigPage({ params }: GuildConfigPageProps) {
  const { botId, guildId } = use(params)
  const { managableGuilds, user, guildsLoading, isLoading: authLoading } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState<Record<string, unknown>>({})

  // Fetch bot data
  const { data: botsData, isLoading: botsLoading } = useSWR("/api/bots", fetcher)

  // Fetch guilds the bot is installed in (to get guild info for admin role users)
  const { data: botGuildsData } = useSWR(
    `/api/bots/${botId}/guilds`,
    fetcher
  )

  // Fetch guilds where user has admin role for this bot
  const { data: adminGuildsData } = useSWR(
    user ? `/api/bots/${botId}/admin-guilds` : null,
    fetcher
  )
  
  // Fetch config for this bot+guild
  const { 
    data: configData, 
    isLoading: configLoading,
    mutate: refreshConfig,
  } = useSWR(
    `/api/bots/${botId}/config?guildId=${guildId}`,
    fetcher
  )

  const bot = botsData?.bots?.find((b: Bot) => b.id === botId) as Bot | undefined
  
  // Check if user has admin role access for this guild or is master user
  const adminRoleGuildIds = new Set<string>(adminGuildsData?.adminGuildIds || [])
  const isMasterUser = adminGuildsData?.isMaster === true
  const hasAdminRoleAccess = adminRoleGuildIds.has(guildId) || isMasterUser

  // Get guild from manageable guilds OR from bot guilds if user has admin role
  const guild = useMemo(() => {
    // First check manageable guilds (Discord permissions)
    const managedGuild = managableGuilds.find((g) => g.id === guildId)
    if (managedGuild) return managedGuild

    // If user has admin role access, create guild info from bot guild data
    if (hasAdminRoleAccess && botGuildsData?.guilds) {
      const botGuild = botGuildsData.guilds.find((g: { id: string; name: string; icon: string | null }) => g.id === guildId)
      if (botGuild) {
        return {
          id: guildId,
          name: botGuild.name,
          icon: botGuild.icon,
          owner: false,
          permissions: "0",
          memberRoles: [], // Will be populated from session if available
        }
      }
    }

    return undefined
  }, [managableGuilds, guildId, hasAdminRoleAccess, botGuildsData?.guilds])

  // Initialize config from API response
  useEffect(() => {
    if (configData?.config) {
      setConfig(configData.config)
    }
  }, [configData])

  // Loading state - wait for auth, guilds, bots and config data
  const isDataLoading = botsLoading || configLoading || authLoading || guildsLoading
  
  // Also wait for adminGuildsData to load (if user is authenticated)
  const adminGuildsLoading = user && !adminGuildsData
  const botGuildsLoading = !botGuildsData
  
  if (isDataLoading || adminGuildsLoading || botGuildsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!bot || !guild) {
    notFound()
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/bots/${botId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId,
          config,
          updatedBy: user?.username || "unknown",
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Configuration saved! Bot will sync automatically.")
        refreshConfig()
      } else {
        toast.error(data.error || "Failed to save configuration")
      }
    } catch (error) {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleFeature = (feature: string) => {
    setConfig((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }))
  }

  const handleInputChange = (key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

// Setup completeness check
    const isSyrupRx = botId === "syruprx"
    const setupChecklist = [
      {
        label: "Bot installed",
        done: true,
      },
      ...(isSyrupRx
        ? [
            {
              label: "Marizma API configured",
              done: !!config["marizma.apiKey"],
            },
          ]
        : []),
      {
        label: "Log channel configured",
        done: !!config.staffLogs || !!config.modLogs || !!config.logChannelId,
      },
      {
        label: "API keys set",
        done: bot.capabilities.keys?.some((key) => !!config[key]) ?? true,
      },
      {
        label: "Features enabled",
        done: bot.capabilities.features?.some((f) => !!config[f]) ?? true,
      },
    ]

  const completedSteps = setupChecklist.filter((s) => s.done).length
  const totalSteps = setupChecklist.length

  // Check if database is configured
  const isDbConfigured = configData?.configured !== false

  // Permission checks for SyrupRx tabs
  // Owner privilege roles: roles that can access the Setup tab (configured in the setup itself)
  const ownerRoleIds = Array.isArray(config["ownerRoleIds"]) 
    ? (config["ownerRoleIds"] as string[]) 
    : []
  const userRoles = guild.memberRoles || []
  const hasOwnerRole = ownerRoleIds.some(roleId => userRoles.includes(roleId))
  
  // Setup tab: Discord server owner OR has owner privilege role OR is master user
  // Regular admin roles do NOT grant setup access
  const canAccessSetup = guild.owner || hasOwnerRole || isMasterUser
  
  // General tab: Discord server owner OR has one of the Admin roles from setup config OR has bot admin role access OR has owner privilege role
  const adminRoleIds = Array.isArray(config["adminRoleIds"]) 
    ? (config["adminRoleIds"] as string[]) 
    : []
  const hasAdminRole = adminRoleIds.some(roleId => userRoles.includes(roleId))
  // hasAdminRoleAccess is computed from the API response - user has one of the configured admin roles
  const canAccessGeneral = guild.owner || hasAdminRole || hasAdminRoleAccess || hasOwnerRole
  
  // Determine default tab based on permissions
  const getDefaultTab = () => {
    if (botId === "syruprx") {
      if (canAccessGeneral) return "syruprx-general"
      if (canAccessSetup) return "setup"
      return "commands" // Commands tab is always accessible
    }
    return "general"
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/dashboard/bots/${botId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {bot.name}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary">
            <Server className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-card-foreground">
                {guild.name}
              </h1>
              {guild.owner && (
                <Badge variant="outline" className="text-xs">
                  Owner
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <BotIcon className="h-4 w-4" />
              Configuring {bot.name}
            </div>
          </div>
        </div>

        {/* Setup Progress */}
        <div className="rounded-lg bg-secondary/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-card-foreground">
              Setup Progress
            </span>
            <span className="text-sm text-muted-foreground">
              {completedSteps}/{totalSteps}
            </span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {setupChecklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {item.done ? (
                  <Check className="h-3 w-3 text-online" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    item.done ? "text-card-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Database Not Configured Warning */}
      {!isDbConfigured && (
        <div className="flex items-center gap-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <div>
            <p className="font-medium text-amber-500">Database Not Configured</p>
            <p className="text-sm text-muted-foreground">
              Configuration cannot be saved. MongoDB is not configured for this bot.
            </p>
          </div>
        </div>
      )}

      {/* Configuration Tabs */}
      <div className="rounded-lg border border-border bg-card">
        <Tabs defaultValue={getDefaultTab()} className="w-full">
          <div className="border-b border-border px-6">
            <TabsList className="h-auto rounded-none border-b-0 bg-transparent p-0">
              {botId !== "syruprx" && (
                <TabsTrigger
                  value="general"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  General
                </TabsTrigger>
              )}
              {botId === "syruprx" && (
                <TabsTrigger
                  value="syruprx-general"
                  disabled={!canAccessGeneral}
                  className={cn(
                    "rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    !canAccessGeneral && "opacity-50 cursor-not-allowed"
                  )}
                  title={!canAccessGeneral ? "Requires server owner or admin role access" : undefined}
                >
                  <Server className="mr-2 h-4 w-4" />
                  General
                  {!canAccessGeneral && <Lock className="ml-2 h-3 w-3" />}
                </TabsTrigger>
              )}
              {botId === "syruprx" && (
                <TabsTrigger
                  value="setup"
                  disabled={!canAccessSetup}
                  className={cn(
                    "rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    !canAccessSetup && "opacity-50 cursor-not-allowed"
                  )}
                  title={!canAccessSetup ? "Requires server owner or Owner Privilege role" : undefined}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Setup
                  {!canAccessSetup && <Lock className="ml-2 h-3 w-3" />}
                </TabsTrigger>
              )}
              {botId === "syruprx" && (
                <TabsTrigger
                  value="commands"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Commands
                </TabsTrigger>
              )}
              {botId !== "syruprx" && bot.capabilities.channels && bot.capabilities.channels.length > 0 && (
                <TabsTrigger
                  value="channels"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Hash className="mr-2 h-4 w-4" />
                  Channels
                </TabsTrigger>
              )}
              {botId !== "syruprx" && bot.capabilities.keys && bot.capabilities.keys.length > 0 && (
                <TabsTrigger
                  value="api-keys"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Key className="mr-2 h-4 w-4" />
                  API Keys
                </TabsTrigger>
              )}
              {botId !== "syruprx" && bot.capabilities.features && bot.capabilities.features.length > 0 && (
                <TabsTrigger
                  value="features"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Features
                </TabsTrigger>
              )}
              {botId !== "syruprx" && bot.capabilities.premium && (
                <TabsTrigger
                  value="premium"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Premium
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* General Tab */}
          <TabsContent value="general" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  General Settings
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure basic settings for {bot.name} in this server
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
                  <div>
                    <Label className="text-sm font-medium">Bot Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable the bot in this server
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled !== false}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Command Prefix
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Custom prefix for text commands (if supported)
                    </p>
                  </div>
                  <Input
                    value={(config.prefix as string) ?? "!"}
                    onChange={(e) => handleInputChange("prefix", e.target.value)}
                    className="w-20 text-center"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SyrupRx General Tab */}
          {botId === "syruprx" && (
            <TabsContent value="syruprx-general" className="p-6">
              {canAccessGeneral ? (
                <SyrupRxGeneralTab guildId={guildId} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground">Access Restricted</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    You need to be the server owner or have an admin role configured in the Setup tab to access this section.
                  </p>
                </div>
              )}
            </TabsContent>
          )}

          {/* Setup Tab (SyrupRx specific - Marizma Configuration) */}
          {botId === "syruprx" && (
            <TabsContent value="setup" className="p-6">
              {canAccessSetup ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Marizma Configuration
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure the Marizma API connection for SyrupRx in this server
                  </p>
                </div>
                <Separator />

                {/* Base URL */}
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="flex items-start gap-3">
                    <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Base URL</Label>
                        <p className="text-sm text-muted-foreground">
                          Select the Marizma API endpoint or enter a custom URL
                        </p>
                      </div>
                      <Select
                        value={
                          (config["marizma.baseURL"] as string) === "https://maple-api.marizma.games/"
                            ? "default"
                            : (config["marizma.baseURL"] as string)
                              ? "custom"
                              : "default"
                        }
                        onValueChange={(value) => {
                          if (value === "default") {
                            handleInputChange("marizma.baseURL", "https://maple-api.marizma.games/")
                          } else if (value === "custom") {
                            // Keep current value or set empty for custom input
                            if (!config["marizma.baseURL"] || config["marizma.baseURL"] === "https://maple-api.marizma.games/") {
                              handleInputChange("marizma.baseURL", "")
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select base URL" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">
                            marizma.games (default)
                          </SelectItem>
                          <SelectItem value="custom">
                            Custom (Not Recommended)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {(config["marizma.baseURL"] as string) !== "https://maple-api.marizma.games/" && 
                       config["marizma.baseURL"] !== undefined && (
                        <Input
                          placeholder="https://your-custom-api.example.com/"
                          value={(config["marizma.baseURL"] as string) ?? ""}
                          onChange={(e) => handleInputChange("marizma.baseURL", e.target.value)}
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Current: {(config["marizma.baseURL"] as string) || "https://maple-api.marizma.games/"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* API Key */}
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="flex items-start gap-3">
                    <Key className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Marizma API Key</Label>
                        <p className="text-sm text-muted-foreground">
                          Your Marizma API key for authentication
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="Enter your Marizma API key"
                          value={(config["marizma.apiKey"] as string) ?? ""}
                          onChange={(e) => handleInputChange("marizma.apiKey", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            toast.info("Testing API connection...")
                            // Could implement actual API test here
                          }}
                          title="Test API connection"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Status: {(config["marizma.apiKey"] as string) ? "Set" : "Not set"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Owner Privileges */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <Crown className="mt-0.5 h-5 w-5 text-amber-500" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-amber-500">Owner Privilege Roles</Label>
                        <p className="text-sm text-muted-foreground">
                          These roles grant access to this Setup tab. The server owner always has access automatically. 
                          Use this for trusted co-owners or lead administrators who need to configure the bot.
                        </p>
                      </div>
                      <Textarea
                        placeholder="Enter role IDs separated by commas (e.g., 123456789, 987654321)"
                        value={
                          Array.isArray(config["ownerRoleIds"])
                            ? (config["ownerRoleIds"] as string[]).join(", ")
                            : (config["ownerRoleIds"] as string) ?? ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          const roleIds = value
                            .split(",")
                            .map((id) => id.trim())
                            .filter((id) => id.length > 0)
                          setConfig((prev) => ({
                            ...prev,
                            ownerRoleIds: roleIds,
                          }))
                        }}
                        rows={2}
                      />
                      <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-500">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          Only assign this to highly trusted roles. These roles can modify all bot settings including API keys and admin roles.
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(config["ownerRoleIds"])
                          ? `${(config["ownerRoleIds"] as string[]).length} role(s) configured`
                          : "No roles configured"} 
                        {" "}&middot; Server owner always has access
                      </p>
                    </div>
                  </div>
                </div>

                {/* Admin Roles */}
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Admin Role IDs</Label>
                        <p className="text-sm text-muted-foreground">
                          Discord role IDs that can access the General tab and moderation commands. These roles cannot access the Setup tab.
                        </p>
                      </div>
                      <Textarea
                        placeholder="Enter role IDs separated by commas (e.g., 123456789, 987654321)"
                        value={
                          Array.isArray(config["adminRoleIds"])
                            ? (config["adminRoleIds"] as string[]).join(", ")
                            : (config["adminRoleIds"] as string) ?? ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          // Store as comma-separated string, will be parsed on save
                          const roleIds = value
                            .split(",")
                            .map((id) => id.trim())
                            .filter((id) => id.length > 0)
                          setConfig((prev) => ({
                            ...prev,
                            adminRoleIds: roleIds,
                          }))
                        }}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(config["adminRoleIds"])
                          ? `${(config["adminRoleIds"] as string[]).length} role(s) configured`
                          : "No roles configured"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Log Channel */}
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Log Channel ID</Label>
                        <p className="text-sm text-muted-foreground">
                          Discord channel ID for Maple action logs
                        </p>
                      </div>
                      <Input
                        placeholder="Enter channel ID (e.g., 123456789012345678)"
                        value={(config["logChannelId"] as string) ?? ""}
                        onChange={(e) => handleInputChange("logChannelId", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Status: {(config["logChannelId"] as string) ? "Configured" : "Not set (optional)"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration Summary */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <h4 className="mb-3 font-medium text-card-foreground">
                    Configuration Summary
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Base URL</span>
                      <span className="font-mono text-xs">
                        {(config["marizma.baseURL"] as string) || "Default"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">API Key</span>
                      <Badge variant={config["marizma.apiKey"] ? "default" : "secondary"}>
                        {config["marizma.apiKey"] ? "Set" : "Not Set"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Owner Roles</span>
                      <span>
                        {Array.isArray(config["ownerRoleIds"]) && config["ownerRoleIds"].length > 0
                          ? `${config["ownerRoleIds"].length} role(s)`
                          : "None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Admin Roles</span>
                      <span>
                        {Array.isArray(config["adminRoleIds"]) && config["adminRoleIds"].length > 0
                          ? `${config["adminRoleIds"].length} role(s)`
                          : "None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Log Channel</span>
                      <Badge variant={config["logChannelId"] ? "default" : "secondary"}>
                        {config["logChannelId"] ? "Configured" : "Not Set"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground">Access Restricted</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    You need to be the server owner or have an Owner Privilege role to access this section. Admin roles do not grant access to Setup.
                  </p>
                </div>
              )}
            </TabsContent>
          )}

          {/* Commands Tab (SyrupRx specific) */}
          {botId === "syruprx" && (
            <TabsContent value="commands" className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Bot Commands
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All available slash commands for SyrupRx in this server
                  </p>
                </div>
                <Separator />

                {/* Server Information Commands */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Info className="h-4 w-4 text-primary" />
                    Server Information
                  </h4>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /serverinfo
                            </code>
                            <Badge variant="secondary" className="text-xs">Public</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Get public server information from Marizma API including server name, player count, owner, admins, and description.
                          </p>
                        </div>
                        <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /serverplayers
                            </code>
                            <Badge variant="secondary" className="text-xs">Public</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            List all players currently online on the game server.
                          </p>
                        </div>
                        <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /serverqueue
                            </code>
                            <Badge variant="secondary" className="text-xs">Public</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            View the current player queue waiting to join the game server.
                          </p>
                        </div>
                        <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Moderation Commands */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    Moderation
                  </h4>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /kickplayer
                            </code>
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">Admin+</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Kick a Roblox player from the server by username or user ID.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              identifier: string (required)
                            </code>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              reason: string (optional)
                            </code>
                          </div>
                        </div>
                        <UserX className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /banplayer
                            </code>
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">Admin+</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Ban or unban a Roblox user by username or user ID. Banning also kicks the player immediately.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              user: string (required)
                            </code>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              banned: boolean (required)
                            </code>
                          </div>
                        </div>
                        <Ban className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /serverbans
                            </code>
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">Admin+</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            View the current ban list on the game server with pagination support.
                          </p>
                        </div>
                        <Ban className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Server Management Commands */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Settings className="h-4 w-4 text-primary" />
                    Server Management
                  </h4>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /announce
                            </code>
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">Admin+</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Send an announcement message to all players on the game server.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              message: string (required)
                            </code>
                          </div>
                        </div>
                        <Megaphone className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /setbanner
                            </code>
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">Admin+</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Set a banner text that displays on the Maple server.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              text: string (required)
                            </code>
                          </div>
                        </div>
                        <Flag className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono text-primary">
                              /setsetting
                            </code>
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">Admin+</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Update Maple server settings like visibility, privacy, and minimum level requirements.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              hidefromlist: boolean (optional)
                            </code>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              private: boolean (optional)
                            </code>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              minlevel: integer (optional)
                            </code>
                          </div>
                        </div>
                        <Settings className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-destructive/20 px-2 py-0.5 text-sm font-mono text-destructive">
                              /shutdown
                            </code>
                            <Badge variant="destructive" className="text-xs">Admin+</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Immediately shut down the Maple game server. Use with caution.
                          </p>
                        </div>
                        <Power className="h-5 w-5 shrink-0 text-destructive" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permission Info */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <h4 className="mb-3 font-medium text-card-foreground">
                    Permission Levels
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs w-16 justify-center">Public</Badge>
                      <span className="text-muted-foreground">Anyone in the server can use these commands</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-500 w-16 justify-center">Admin+</Badge>
                      <span className="text-muted-foreground">Requires a configured Admin Role ID from the Setup tab</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
          
          {/* Channels Tab */}
          <TabsContent value="channels" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  Channel Configuration
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set up log channels and output destinations
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                {bot.capabilities.channels?.map((channel) => (
                  <div
                    key={channel}
                    className="rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <Label className="mb-2 block text-sm font-medium capitalize">
                      {channel.replace(/([A-Z])/g, " $1").trim()}
                    </Label>
                    <Input
                      placeholder="Enter channel ID"
                      value={(config[channel] as string) ?? ""}
                      onChange={(e) => handleInputChange(channel, e.target.value)}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter the Discord channel ID for {channel}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  API Keys & Secrets
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure external service integrations
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                {bot.capabilities.keys?.map((key) => (
                  <div
                    key={key}
                    className="rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <Label className="mb-2 block text-sm font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Enter API key"
                        value={(config[key] as string) ?? ""}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          toast.info("Testing API key...")
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your API key is encrypted and securely stored
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  Feature Toggles
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enable or disable specific bot features
                </p>
              </div>
              <Separator />
              <div className="space-y-4">
                {bot.capabilities.features?.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <div>
                      <Label className="text-sm font-medium capitalize">
                        {feature.replace(/([A-Z])/g, " $1").trim()}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable {feature} functionality
                      </p>
                    </div>
                    <Switch
                      checked={!!config[feature]}
                      onCheckedChange={() => handleToggleFeature(feature)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Premium Tab */}
          <TabsContent value="premium" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  Premium Features
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage premium subscription and features
                </p>
              </div>
              <Separator />
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-card-foreground">
                      Premium Status
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This guild has premium features enabled
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Badge className="bg-primary/20 text-primary">Active</Badge>
                      <span className="text-sm text-muted-foreground">
                        Renews on Feb 15, 2026
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex items-center justify-between border-t border-border p-6">
          <div className="text-sm text-muted-foreground">
            {configData?.updatedAt && (
              <>Last saved: {new Date(configData.updatedAt).toLocaleString()}</>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving || !isDbConfigured}>
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
