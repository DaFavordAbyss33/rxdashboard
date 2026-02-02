"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { 
  Server, 
  Settings, 
  Trash2, 
  RefreshCw, 
  Shield, 
  Bot,
  Search,
  AlertTriangle,
  CheckCircle,
  Save,
  Loader2,
  Mail,
  Send,
  FileText,
  Upload,
  Copy,
  Eye,
  Pencil,
  ExternalLink,
  MoreHorizontal,
  Plus,
  X,
  Users,
  UserPlus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface BotSettings {
  maintenanceMode: boolean
  debugLogging: boolean
  autoRestart: boolean
  customStatus: string
  commandPrefix: string
  enabledFeatures: string[]
  updatedAt?: string
  updatedBy?: string
}

const BOT_NAMES: Record<string, string> = {
  syruprx: "SyrupRx",
  "syruprx-pro": "SyrupRx PRO",
  autoclockrx: "AutoclockRx",
  mednoterx: "MedNoteRx",
  swissrx: "SwissRx",
}

const DEFAULT_SETTINGS: BotSettings = {
  maintenanceMode: false,
  debugLogging: false,
  autoRestart: true,
  customStatus: "",
  commandPrefix: "!",
  enabledFeatures: [],
}

export default function AdminPage() {
  const { isAdmin, isAdminLoading, isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [leavingGuild, setLeavingGuild] = useState<string | null>(null)
  const [selectedBot, setSelectedBot] = useState<string>("syruprx")
  const [localSettings, setLocalSettings] = useState<BotSettings>(DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Template state
  const [isUploadingTemplate, setIsUploadingTemplate] = useState<string | null>(null)
  const [templateResult, setTemplateResult] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [templateAction, setTemplateAction] = useState<{ id: string; action: string } | null>(null)

  // Newsletter editor state
  const [newsletterContent, setNewsletterContent] = useState({
    heroTitle: "NEWSLETTER",
    heroSubtitle: "Quick updates on bots, new features, and what's shipping next.",
    highlightsIntro: "A quick look at what happened this month and upcoming changes you should know about.",
    highlights: ["New dashboard UI with improved navigation", "Bot status monitoring improvements", "Performance optimizations across all bots"],
    features: [{ title: "Improved Bot Monitoring", description: "Real-time status updates and incident tracking for all your bots.", linkText: "View Dashboard", linkUrl: "https://rxsystems.app/dashboard" }],
    ctaText: "Open Dashboard",
    ctaUrl: "https://rxsystems.app/dashboard",
  })
  const [previewHtml, setPreviewHtml] = useState<string>("")
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Contacts state
  const [isSyncingContacts, setIsSyncingContacts] = useState(false)
  const [contactsResult, setContactsResult] = useState<{ type: "success" | "error"; text: string; stats?: { created: number; updated: number; failed: number; total: number } } | null>(null)

  // Fetch contacts from Resend
  const { data: contactsData, isLoading: contactsLoading, mutate: mutateContacts } = useSWR(
    "/api/admin/contacts",
    fetcher
  )

  // Fetch subscribed users from database
  const { data: subscribedUsersData, isLoading: subscribedUsersLoading, mutate: mutateSubscribedUsers } = useSWR(
    "/api/admin/contacts?action=subscribed",
    fetcher
  )

  // Fetch templates from Resend
  const { data: templatesData, isLoading: templatesLoading, mutate: mutateTemplates } = useSWR(
    "/api/admin/templates",
    fetcher
  )

  interface ResendTemplate {
    id: string
    name: string
    created_at: string
    status?: string
  }

  const { data: guildsData, error: guildsError, isLoading: guildsLoading } = useSWR(
    "/api/admin/guilds",
    fetcher,
    { refreshInterval: 60000 }
  )

  const { data: settingsData, error: settingsError, isLoading: settingsLoading } = useSWR(
    `/api/admin/settings?botId=${selectedBot}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  // Sync local settings when data loads or bot changes
  useEffect(() => {
    if (settingsData?.settings?.data) {
      setLocalSettings(settingsData.settings.data)
    } else {
      setLocalSettings(DEFAULT_SETTINGS)
    }
    setSaveMessage(null)
  }, [settingsData, selectedBot])

  // Save settings to MongoDB
  const handleSaveSettings = useCallback(async () => {
    setIsSaving(true)
    setSaveMessage(null)
    
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: selectedBot,
          settings: localSettings,
          updatedBy: user?.username || "admin",
        }),
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        setSaveMessage({ type: "success", text: "Settings saved! Bot will sync automatically." })
        mutate(`/api/admin/settings?botId=${selectedBot}`)
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save settings" })
      }
    } catch (error) {
      setSaveMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }, [selectedBot, localSettings, user])

  // Update a single setting
  const updateSetting = <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setSaveMessage(null) // Clear message when user makes changes
  }

  // Sync contacts to Resend
  const handleSyncContacts = async () => {
    setIsSyncingContacts(true)
    setContactsResult(null)

    try {
      const response = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setContactsResult({ 
          type: "success", 
          text: data.message,
          stats: data.stats 
        })
        mutateContacts()
        mutateSubscribedUsers()
      } else {
        setContactsResult({ type: "error", text: data.error || "Failed to sync contacts" })
      }
    } catch (error) {
      setContactsResult({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsSyncingContacts(false)
    }
  }

  // Generate HTML preview
  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true)
    try {
      const response = await fetch("/api/admin/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newsletterContent }),
      })
      const data = await response.json()
      if (data.success) {
        setPreviewHtml(data.html)
        setShowPreview(true)
      }
    } catch (error) {
      console.error("Failed to generate preview:", error)
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // Upload custom newsletter to Resend
  const handleUploadCustomNewsletter = async () => {
    setIsUploadingTemplate("custom")
    setTemplateResult(null)

    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: "newsletter", customContent: newsletterContent }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTemplateResult({ type: "success", text: `${data.message}` })
        mutateTemplates()
      } else {
        setTemplateResult({ type: "error", text: data.error || "Failed to upload template" })
      }
    } catch (error) {
      setTemplateResult({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsUploadingTemplate(null)
    }
  }

  // Upload template to Resend
  const handleUploadTemplate = async (templateKey: "newsletter" | "notice") => {
    setIsUploadingTemplate(templateKey)
    setTemplateResult(null)

    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTemplateResult({ type: "success", text: `${data.message}` })
        mutateTemplates()
      } else {
        setTemplateResult({ type: "error", text: data.error || "Failed to upload template" })
      }
    } catch (error) {
      setTemplateResult({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsUploadingTemplate(null)
    }
  }

  // Duplicate a template
  const handleDuplicateTemplate = async (templateId: string) => {
    setTemplateAction({ id: templateId, action: "duplicate" })
    setTemplateResult(null)

    try {
      const response = await fetch("/api/admin/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTemplateResult({ type: "success", text: `Template duplicated! New ID: ${data.templateId}` })
        mutateTemplates()
      } else {
        setTemplateResult({ type: "error", text: data.error || "Failed to duplicate template" })
      }
    } catch (error) {
      setTemplateResult({ type: "error", text: "Network error. Please try again." })
    } finally {
      setTemplateAction(null)
    }
  }

  // Publish a template
  const handlePublishTemplate = async (templateId: string) => {
    setTemplateAction({ id: templateId, action: "publish" })
    setTemplateResult(null)

    try {
      const response = await fetch("/api/admin/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, publish: true }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTemplateResult({ type: "success", text: "Template published successfully!" })
        mutateTemplates()
      } else {
        setTemplateResult({ type: "error", text: data.error || "Failed to publish template" })
      }
    } catch (error) {
      setTemplateResult({ type: "error", text: "Network error. Please try again." })
    } finally {
      setTemplateAction(null)
    }
  }

  // Delete a template
  const handleDeleteTemplate = async (templateId: string) => {
    setTemplateAction({ id: templateId, action: "delete" })
    setTemplateResult(null)

    try {
      const response = await fetch(`/api/admin/templates?templateId=${templateId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTemplateResult({ type: "success", text: "Template deleted successfully!" })
        mutateTemplates()
      } else {
        setTemplateResult({ type: "error", text: data.error || "Failed to delete template" })
      }
    } catch (error) {
      setTemplateResult({ type: "error", text: "Network error. Please try again." })
    } finally {
      setTemplateAction(null)
    }
  }

  // Redirect non-admins
  useEffect(() => {
    if (!isLoading && !isAdminLoading) {
      if (!isAuthenticated) {
        router.push("/")
      } else if (!isAdmin) {
        router.push("/dashboard/bots")
      }
    }
  }, [isAdmin, isAdminLoading, isAuthenticated, isLoading, router])

  if (isLoading || isAdminLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Shield className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
      </div>
    )
  }

  const handleLeaveGuild = async (guildId: string, botId: string) => {
    setLeavingGuild(guildId)
    try {
      const response = await fetch(`/api/admin/guilds/${guildId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId }),
      })

      if (response.ok) {
        // Refresh guilds data
        mutate("/api/admin/guilds")
      } else {
        const data = await response.json()
        alert(`Failed to leave guild: ${data.error}`)
      }
    } catch (error) {
      console.error("Error leaving guild:", error)
      alert("Failed to leave guild")
    } finally {
      setLeavingGuild(null)
    }
  }

  const handleRefresh = () => {
    mutate("/api/admin/guilds")
  }

  // Flatten guilds from all bots and filter by search
  const allGuilds = guildsData?.data?.flatMap((bot: any) => 
    bot.guilds.map((guild: any) => ({ ...guild, botId: bot.botId }))
  ) || []

  const filteredGuilds = allGuilds.filter((guild: any) =>
    guild.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guild.id.includes(searchTerm)
  )

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
          </div>
          <p className="mt-1 text-muted-foreground">
            Manage servers and bot settings across all bots
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="servers" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="servers" className="gap-2">
            <Server className="h-4 w-4" />
            Servers
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Bot Settings
          </TabsTrigger>
          <TabsTrigger value="notices" className="gap-2">
            <Mail className="h-4 w-4" />
            Notices
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Servers Tab */}
        <TabsContent value="servers" className="mt-6 space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search servers by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredGuilds.length} server{filteredGuilds.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Server List */}
          {guildsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : guildsError ? (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="flex items-center gap-4 py-6">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Failed to load servers</p>
                  <p className="text-sm text-muted-foreground">Please check your bot tokens and try again.</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredGuilds.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Server className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {searchTerm ? "No servers match your search" : "No servers found"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGuilds.map((guild: any) => (
                <Card key={`${guild.botId}-${guild.id}`} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {guild.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                            alt={guild.name}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Server className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{guild.name}</CardTitle>
                          <CardDescription className="text-xs">
                            ID: {guild.id}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="gap-1">
                        <Bot className="h-3 w-3" />
                        {BOT_NAMES[guild.botId] || guild.botId}
                      </Badge>
                      {guild.memberCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {guild.memberCount.toLocaleString()} members
                        </span>
                      )}
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full gap-2"
                          disabled={leavingGuild === guild.id}
                        >
                          {leavingGuild === guild.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Leaving...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Remove Bot
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove bot from server?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove <strong>{BOT_NAMES[guild.botId]}</strong> from <strong>{guild.name}</strong>. 
                            The server owner will need to re-invite the bot if they want to use it again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleLeaveGuild(guild.id, guild.botId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove Bot
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          {/* Bot Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Bot</CardTitle>
              <CardDescription>Choose a bot to configure its global settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(BOT_NAMES).map(([id, name]) => (
                  <Button
                    key={id}
                    variant={selectedBot === id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedBot(id)
                      setSaveMessage(null)
                    }}
                    className="gap-2"
                  >
                    <Bot className="h-4 w-4" />
                    {name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bot Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle>{BOT_NAMES[selectedBot]} Settings</CardTitle>
                </div>
                {settingsData?.settings?.data?.updatedAt && (
                  <Badge variant="outline" className="text-xs">
                    Last updated: {new Date(settingsData.settings.data.updatedAt).toLocaleString()}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Configure global settings for this bot. Changes sync automatically to the bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !settingsData?.settings?.configured ? (
                <div className="flex items-center gap-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-500">Database Not Configured</p>
                    <p className="text-sm text-muted-foreground">
                      MongoDB is not configured for this bot. Add the MONGODB_URI_{selectedBot.toUpperCase().replace("-", "_")} environment variable.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Disable bot commands temporarily for all servers
                        </p>
                      </div>
                      <Switch 
                        checked={localSettings.maintenanceMode}
                        onCheckedChange={(checked) => updateSetting("maintenanceMode", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Debug Logging</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable verbose logging for troubleshooting
                        </p>
                      </div>
                      <Switch 
                        checked={localSettings.debugLogging}
                        onCheckedChange={(checked) => updateSetting("debugLogging", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Auto Restart</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically restart on crash
                        </p>
                      </div>
                      <Switch 
                        checked={localSettings.autoRestart}
                        onCheckedChange={(checked) => updateSetting("autoRestart", checked)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="commandPrefix">Command Prefix</Label>
                      <Input
                        id="commandPrefix"
                        placeholder="!"
                        value={localSettings.commandPrefix}
                        onChange={(e) => updateSetting("commandPrefix", e.target.value)}
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customStatus">Custom Status Message</Label>
                      <Input
                        id="customStatus"
                        placeholder="Playing with commands..."
                        value={localSettings.customStatus}
                        onChange={(e) => updateSetting("customStatus", e.target.value)}
                        maxLength={128}
                      />
                    </div>
                  </div>

                  {/* Save Status */}
                  {saveMessage && (
                    <div className={`flex items-center gap-2 rounded-lg p-4 ${
                      saveMessage.type === "success" 
                        ? "bg-green-500/10 border border-green-500/50" 
                        : "bg-destructive/10 border border-destructive/50"
                    }`}>
                      {saveMessage.type === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      )}
                      <span className={`text-sm ${
                        saveMessage.type === "success" ? "text-green-500" : "text-destructive"
                      }`}>
                        {saveMessage.text}
                      </span>
                    </div>
                  )}

                  <Button 
                    className="w-full gap-2" 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notices Tab */}
        <TabsContent value="notices" className="mt-6 space-y-6">
          {/* Current Newsletter Issue Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle>Newsletter Issue Info</CardTitle>
                </div>
                <a 
                  href="https://resend.com/templates" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Open Resend
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Issue Number</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, "0")}
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Month</p>
                  <p className="mt-1 text-2xl font-bold">
                    {new Date().toLocaleString("en-GB", { month: "long" })}
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Year</p>
                  <p className="mt-1 text-2xl font-bold">
                    {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Result Message */}
          {templateResult && (
            <div className={`flex items-center gap-2 rounded-lg p-4 ${
              templateResult.type === "success" 
                ? "bg-green-500/10 border border-green-500/50" 
                : "bg-destructive/10 border border-destructive/50"
            }`}>
              {templateResult.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <span className={`text-sm ${
                templateResult.type === "success" ? "text-green-500" : "text-destructive"
              }`}>
                {templateResult.text}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto h-6 px-2"
                onClick={() => setTemplateResult(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Newsletter Editor */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                <CardTitle>Newsletter Editor</CardTitle>
              </div>
              <CardDescription>
                Customize your newsletter content, preview it, then push to Resend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hero Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Header</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero Title</Label>
                    <Input
                      id="heroTitle"
                      value={newsletterContent.heroTitle}
                      onChange={(e) => setNewsletterContent(prev => ({ ...prev, heroTitle: e.target.value }))}
                      placeholder="NEWSLETTER"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ctaText">CTA Button Text</Label>
                    <Input
                      id="ctaText"
                      value={newsletterContent.ctaText}
                      onChange={(e) => setNewsletterContent(prev => ({ ...prev, ctaText: e.target.value }))}
                      placeholder="Open Dashboard"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                  <Textarea
                    id="heroSubtitle"
                    value={newsletterContent.heroSubtitle}
                    onChange={(e) => setNewsletterContent(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                    placeholder="Quick updates on bots, new features, and what's shipping next."
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Highlights Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Highlights</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewsletterContent(prev => ({
                      ...prev,
                      highlights: [...prev.highlights, ""]
                    }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Highlight
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highlightsIntro">Highlights Intro</Label>
                  <Input
                    id="highlightsIntro"
                    value={newsletterContent.highlightsIntro}
                    onChange={(e) => setNewsletterContent(prev => ({ ...prev, highlightsIntro: e.target.value }))}
                    placeholder="A quick look at what happened this month..."
                  />
                </div>
                <div className="space-y-2">
                  {newsletterContent.highlights.map((highlight, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={highlight}
                        onChange={(e) => {
                          const newHighlights = [...newsletterContent.highlights]
                          newHighlights[index] = e.target.value
                          setNewsletterContent(prev => ({ ...prev, highlights: newHighlights }))
                        }}
                        placeholder={`Highlight ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => {
                          const newHighlights = newsletterContent.highlights.filter((_, i) => i !== index)
                          setNewsletterContent(prev => ({ ...prev, highlights: newHighlights }))
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Features Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Features</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewsletterContent(prev => ({
                      ...prev,
                      features: [...prev.features, { title: "", description: "", linkText: "", linkUrl: "" }]
                    }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>
                {newsletterContent.features.map((feature, index) => (
                  <Card key={index} className="bg-muted/30">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Feature {index + 1}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFeatures = newsletterContent.features.filter((_, i) => i !== index)
                            setNewsletterContent(prev => ({ ...prev, features: newFeatures }))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={feature.title}
                            onChange={(e) => {
                              const newFeatures = [...newsletterContent.features]
                              newFeatures[index] = { ...feature, title: e.target.value }
                              setNewsletterContent(prev => ({ ...prev, features: newFeatures }))
                            }}
                            placeholder="Feature title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Link Text</Label>
                          <Input
                            value={feature.linkText}
                            onChange={(e) => {
                              const newFeatures = [...newsletterContent.features]
                              newFeatures[index] = { ...feature, linkText: e.target.value }
                              setNewsletterContent(prev => ({ ...prev, features: newFeatures }))
                            }}
                            placeholder="View Dashboard"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={feature.description}
                          onChange={(e) => {
                            const newFeatures = [...newsletterContent.features]
                            newFeatures[index] = { ...feature, description: e.target.value }
                            setNewsletterContent(prev => ({ ...prev, features: newFeatures }))
                          }}
                          placeholder="Feature description"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Link URL</Label>
                        <Input
                          value={feature.linkUrl}
                          onChange={(e) => {
                            const newFeatures = [...newsletterContent.features]
                            newFeatures[index] = { ...feature, linkUrl: e.target.value }
                            setNewsletterContent(prev => ({ ...prev, features: newFeatures }))
                          }}
                          placeholder="https://rxsystems.app/dashboard"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleGeneratePreview}
                  disabled={isGeneratingPreview}
                >
                  {isGeneratingPreview ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Preview HTML
                </Button>
                <Button
                  onClick={handleUploadCustomNewsletter}
                  disabled={isUploadingTemplate !== null}
                >
                  {isUploadingTemplate === "custom" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Push to Resend
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* HTML Preview */}
          {showPreview && previewHtml && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <CardTitle>Email Preview</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[600px] bg-white"
                    title="Email Preview"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Push Default Templates */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Quick Push Default Templates</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Push the default templates without customization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUploadTemplate("newsletter")}
                  disabled={isUploadingTemplate !== null}
                >
                  {isUploadingTemplate === "newsletter" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Default Newsletter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUploadTemplate("notice")}
                  disabled={isUploadingTemplate !== null}
                >
                  {isUploadingTemplate === "notice" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Default Notice
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Newsletter Contacts</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { mutateContacts(); mutateSubscribedUsers(); }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSyncContacts}
                    disabled={isSyncingContacts}
                  >
                    {isSyncingContacts ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Sync to Resend
                  </Button>
                </div>
              </div>
              <CardDescription>
                Manage newsletter subscribers. Sync users with "Creator Notices" enabled to Resend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contacts Result */}
              {contactsResult && (
                <div className={`flex items-start gap-2 rounded-lg p-4 ${
                  contactsResult.type === "success" 
                    ? "bg-green-500/10 border border-green-500/50" 
                    : "bg-destructive/10 border border-destructive/50"
                }`}>
                  {contactsResult.type === "success" ? (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className={`text-sm ${
                      contactsResult.type === "success" ? "text-green-500" : "text-destructive"
                    }`}>
                      {contactsResult.text}
                    </span>
                    {contactsResult.stats && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                          {contactsResult.stats.created} created
                        </Badge>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                          {contactsResult.stats.updated} updated
                        </Badge>
                        {contactsResult.stats.failed > 0 && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            {contactsResult.stats.failed} failed
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 shrink-0"
                    onClick={() => setContactsResult(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Subscribed Users (Database) */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Users with Notices Enabled</p>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {subscribedUsersLoading ? (
                    <Skeleton className="mt-2 h-8 w-16" />
                  ) : (
                    <p className="mt-2 text-2xl font-bold">
                      {subscribedUsersData?.count || 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">From your database</p>
                </div>

                {/* Resend Contacts */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Resend Contacts</p>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {contactsLoading ? (
                    <Skeleton className="mt-2 h-8 w-16" />
                  ) : (
                    <p className="mt-2 text-2xl font-bold">
                      {contactsData?.contacts?.data?.length || 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Synced to Resend audience</p>
                </div>
              </div>

              {/* Subscribed Users List */}
              {subscribedUsersData?.users?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Subscribed Users</p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border">
                    {subscribedUsersData.users.slice(0, 20).map((user: { discordId: string; username: string; email?: string }) => (
                      <div 
                        key={user.discordId} 
                        className="flex items-center justify-between border-b last:border-0 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {user.username?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <span className="text-sm">{user.username}</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {user.email || "No email"}
                        </span>
                      </div>
                    ))}
                    {subscribedUsersData.users.length > 20 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                        +{subscribedUsersData.users.length - 20} more users
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6 space-y-6">
          {/* Template Result Message */}
          {templateResult && (
            <div className={`flex items-center gap-2 rounded-lg p-4 ${
              templateResult.type === "success" 
                ? "bg-green-500/10 border border-green-500/50" 
                : "bg-destructive/10 border border-destructive/50"
            }`}>
              {templateResult.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <span className={`text-sm ${
                templateResult.type === "success" ? "text-green-500" : "text-destructive"
              }`}>
                {templateResult.text}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto h-6 px-2"
                onClick={() => setTemplateResult(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Create New Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <CardTitle>Create Template</CardTitle>
                </div>
                <a 
                  href="https://resend.com/templates" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Open Resend
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <CardDescription>
                Upload pre-built templates to Resend. Edit them visually in Resend&apos;s dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Newsletter Template */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Newsletter</p>
                      <p className="text-xs text-muted-foreground">Monthly updates template</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleUploadTemplate("newsletter")}
                    disabled={isUploadingTemplate !== null}
                  >
                    {isUploadingTemplate === "newsletter" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>

                {/* Notice Template */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Send className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Notice</p>
                      <p className="text-xs text-muted-foreground">Announcements template</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleUploadTemplate("notice")}
                    disabled={isUploadingTemplate !== null}
                  >
                    {isUploadingTemplate === "notice" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>Your Templates</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => mutateTemplates()}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <CardDescription>
                Manage your email templates in Resend. Duplicate, publish, or delete as needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : !templatesData?.templates?.data?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No templates found</p>
                  <p className="text-sm text-muted-foreground">Create a template above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templatesData.templates.data.map((template: ResendTemplate) => (
                    <div 
                      key={template.id} 
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{template.name}</p>
                            {template.status && (
                              <Badge variant={template.status === "published" ? "default" : "secondary"} className="text-[10px]">
                                {template.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(template.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => window.open(`https://resend.com/templates/${template.id}`, "_blank")}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              {templateAction?.id === template.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => window.open(`https://resend.com/templates/${template.id}`, "_blank")}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View in Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDuplicateTemplate(template.id)}
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handlePublishTemplate(template.id)}
                              className="gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete template?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete <strong>{template.name}</strong>. 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
