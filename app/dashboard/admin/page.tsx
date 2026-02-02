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
} from "lucide-react"
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
  
  // Notice/Email state
  const [noticeSubject, setNoticeSubject] = useState("")
  const [noticeMessage, setNoticeMessage] = useState("")
  const [isSendingNotice, setIsSendingNotice] = useState(false)
  const [noticeResult, setNoticeResult] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Template state
  const [isUploadingTemplate, setIsUploadingTemplate] = useState<string | null>(null)
  const [templateResult, setTemplateResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

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
        setTemplateResult({ type: "success", text: `${data.message}. Template ID: ${data.templateId}` })
      } else {
        setTemplateResult({ type: "error", text: data.error || "Failed to upload template" })
      }
    } catch (error) {
      setTemplateResult({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsUploadingTemplate(null)
    }
  }

  // Send notice/email to all users
  const handleSendNotice = async () => {
    if (!noticeSubject.trim() || !noticeMessage.trim()) {
      setNoticeResult({ type: "error", text: "Please fill in both subject and message" })
      return
    }

    setIsSendingNotice(true)
    setNoticeResult(null)

    try {
      const response = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: noticeSubject,
          message: noticeMessage,
          sentBy: user?.username || "admin",
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setNoticeResult({ type: "success", text: `Notice sent to ${data.recipientCount} user(s)!` })
        setNoticeSubject("")
        setNoticeMessage("")
      } else {
        setNoticeResult({ type: "error", text: data.error || "Failed to send notice" })
      }
    } catch (error) {
      setNoticeResult({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsSendingNotice(false)
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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Send Notice to Users</CardTitle>
              </div>
              <CardDescription>
                Compose and send email notifications to all users who have enabled creator notices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="noticeSubject">Subject</Label>
                <Input
                  id="noticeSubject"
                  placeholder="Important update about your bots..."
                  value={noticeSubject}
                  onChange={(e) => {
                    setNoticeSubject(e.target.value)
                    setNoticeResult(null)
                  }}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="noticeMessage">Message</Label>
                <Textarea
                  id="noticeMessage"
                  placeholder="Write your notice message here..."
                  value={noticeMessage}
                  onChange={(e) => {
                    setNoticeMessage(e.target.value)
                    setNoticeResult(null)
                  }}
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  {noticeMessage.length}/2000 characters
                </p>
              </div>

              {/* Notice Result */}
              {noticeResult && (
                <div className={`flex items-center gap-2 rounded-lg p-4 ${
                  noticeResult.type === "success" 
                    ? "bg-green-500/10 border border-green-500/50" 
                    : "bg-destructive/10 border border-destructive/50"
                }`}>
                  {noticeResult.type === "success" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  <span className={`text-sm ${
                    noticeResult.type === "success" ? "text-green-500" : "text-destructive"
                  }`}>
                    {noticeResult.text}
                  </span>
                </div>
              )}

              <Button 
                className="w-full gap-2" 
                onClick={handleSendNotice}
                disabled={isSendingNotice || !noticeSubject.trim() || !noticeMessage.trim()}
              >
                {isSendingNotice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Notice
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Notice History (placeholder for future) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Notices</CardTitle>
              <CardDescription>Previously sent notices will appear here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No notices sent yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Email Templates</CardTitle>
              </div>
              <CardDescription>
                Upload email templates to Resend for editing in their visual editor.
                Once uploaded, you can edit them at{" "}
                <a href="https://resend.com/templates" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  resend.com/templates
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Result */}
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
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {/* Newsletter Template */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Newsletter Template
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Monthly newsletter with highlights and features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Variables:</p>
                        <code className="text-[10px] block bg-muted p-2 rounded">
                          HERO_TITLE, HIGHLIGHT_1-4, FEATURE_1/2_TITLE, FEATURE_1/2_DESC, CTA_TEXT, CTA_URL
                        </code>
                      </div>
                      <Button 
                        className="w-full gap-2" 
                        onClick={() => handleUploadTemplate("newsletter")}
                        disabled={isUploadingTemplate !== null}
                      >
                        {isUploadingTemplate === "newsletter" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload to Resend
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notice Template */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Notice Template
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Simple notice/announcement emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Variables:</p>
                        <code className="text-[10px] block bg-muted p-2 rounded">
                          SUBJECT, USERNAME, MESSAGE
                        </code>
                      </div>
                      <Button 
                        className="w-full gap-2" 
                        onClick={() => handleUploadTemplate("notice")}
                        disabled={isUploadingTemplate !== null}
                      >
                        {isUploadingTemplate === "notice" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload to Resend
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
