"use client"

import { use, useState } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  getBotById,
  getConfigForBotGuild,
  isGuildInstalled,
} from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"
import { toast } from "sonner"

interface GuildConfigPageProps {
  params: Promise<{ botId: string; guildId: string }>
}

export default function GuildConfigPage({ params }: GuildConfigPageProps) {
  const { botId, guildId } = use(params)
  const { managableGuilds } = useAuth()
  const [isSaving, setIsSaving] = useState(false)

  const bot = getBotById(botId)
  const guild = managableGuilds.find((g) => g.id === guildId)

  if (!bot || !guild) {
    notFound()
  }

  // Check if bot is installed in this guild
  if (!isGuildInstalled(botId, guildId)) {
    notFound()
  }

  const existingConfig = getConfigForBotGuild(botId, guildId)

  // Form state
  const [config, setConfig] = useState<Record<string, unknown>>(
    existingConfig?.config ?? {}
  )

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    toast.success("Configuration saved successfully")
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
  const setupChecklist = [
    {
      label: "Bot installed",
      done: true,
    },
    {
      label: "Log channel configured",
      done: !!config.staffLogs || !!config.modLogs,
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
        <div className="flex justify-end border-t border-border p-6">
          <Button onClick={handleSave} disabled={isSaving}>
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
