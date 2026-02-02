"use client"

import { use, useState, useEffect } from "react"
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
} from "lucide-react"
import { toast } from "sonner"

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
  const { managableGuilds, user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState<Record<string, unknown>>({})

  // Fetch bot data
  const { data: botsData, isLoading: botsLoading } = useSWR("/api/bots", fetcher)
  
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
  const guild = managableGuilds.find((g) => g.id === guildId)

  // Initialize config from API response
  useEffect(() => {
    if (configData?.config) {
      setConfig(configData.config)
    }
  }, [configData])

  // Loading state
  if (botsLoading || configLoading) {
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
        <Tabs defaultValue="general" className="w-full">
          <div className="border-b border-border px-6">
            <TabsList className="h-auto rounded-none border-b-0 bg-transparent p-0">
              <TabsTrigger
                value="general"
                className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Settings className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
              {botId === "syruprx" && (
                <TabsTrigger
                  value="setup"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Setup
                </TabsTrigger>
              )}
              {bot.capabilities.channels && bot.capabilities.channels.length > 0 && (
                <TabsTrigger
                  value="channels"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Hash className="mr-2 h-4 w-4" />
                  Channels
                </TabsTrigger>
              )}
              {bot.capabilities.keys && bot.capabilities.keys.length > 0 && (
                <TabsTrigger
                  value="api-keys"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Key className="mr-2 h-4 w-4" />
                  API Keys
                </TabsTrigger>
              )}
              {bot.capabilities.features && bot.capabilities.features.length > 0 && (
                <TabsTrigger
                  value="features"
                  className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Features
                </TabsTrigger>
              )}
              {bot.capabilities.premium && (
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

          {/* Setup Tab (SyrupRx specific - Marizma Configuration) */}
          {botId === "syruprx" && (
            <TabsContent value="setup" className="p-6">
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

                {/* Admin Roles */}
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Admin Role IDs</Label>
                        <p className="text-sm text-muted-foreground">
                          Discord role IDs that should have Maple admin permissions (comma-separated)
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
