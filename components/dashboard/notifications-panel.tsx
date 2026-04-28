"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Bell,
  Settings2,
  Globe,
  Bot,
  Shield,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  ChevronDown,
} from "lucide-react"

export type NotificationCategory =
  | "config_change"
  | "website_change"
  | "bot_update"
  | "security"
  | "incident"
  | "system"

export interface Notification {
  id: string
  category: NotificationCategory
  title: string
  description: string
  timestamp: string
  read: boolean
  severity: "info" | "warning" | "error" | "success"
  metadata?: Record<string, unknown>
}

const CATEGORY_CONFIG: Record<
  NotificationCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  config_change: {
    label: "Config Changes",
    icon: Settings2,
    color: "text-rx-purple",
  },
  website_change: {
    label: "Website Changes",
    icon: Globe,
    color: "text-rx-orange",
  },
  bot_update: {
    label: "Bot Updates",
    icon: Bot,
    color: "text-primary",
  },
  security: {
    label: "Security",
    icon: Shield,
    color: "text-destructive",
  },
  incident: {
    label: "Incidents",
    icon: AlertTriangle,
    color: "text-warning",
  },
  system: {
    label: "System",
    icon: Info,
    color: "text-muted-foreground",
  },
}

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-l-primary/60",
  warning: "border-l-warning",
  error: "border-l-destructive",
  success: "border-l-success",
}

// Demo notifications to show the categories in action
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    category: "config_change",
    title: "SyrupRx Config Updated",
    description: "Role sync settings were changed for Maple Community by DaFavord.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false,
    severity: "info",
    metadata: { botId: "syruprx", guildId: "guild-1", changedFields: ["roleSync", "staffLogs"] },
  },
  {
    id: "n2",
    category: "website_change",
    title: "Dashboard v1.2.0 Released",
    description: "New notifications panel, tier badges, and performance improvements.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    severity: "success",
  },
  {
    id: "n3",
    category: "incident",
    title: "SwissRx Disconnected",
    description: "Bot went offline unexpectedly. Investigating the issue.",
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    read: false,
    severity: "error",
    metadata: { botId: "swissrx" },
  },
  {
    id: "n4",
    category: "bot_update",
    title: "SyrupRx v3.1 Deployed",
    description: "New pager system and improved staff logging features.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: true,
    severity: "info",
  },
  {
    id: "n5",
    category: "security",
    title: "New Login Detected",
    description: "A new login was detected from Chrome on Windows.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    read: true,
    severity: "warning",
  },
  {
    id: "n6",
    category: "config_change",
    title: "SwissRx Settings Changed",
    description: "Auto-announce settings were updated for Maple Community.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    read: true,
    severity: "info",
    metadata: { botId: "swissrx", guildId: "guild-1" },
  },
  {
    id: "n7",
    category: "system",
    title: "Scheduled Maintenance",
    description: "Database maintenance window completed successfully.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    severity: "info",
  },
]

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diff = now - date

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateString).toLocaleDateString()
}

const ALL_CATEGORIES: NotificationCategory[] = [
  "config_change",
  "website_change",
  "bot_update",
  "security",
  "incident",
  "system",
]

export function NotificationsPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS)
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | "all">("all")
  const [showCategories, setShowCategories] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const filteredNotifications =
    selectedCategory === "all"
      ? notifications
      : notifications.filter((n) => n.category === selectedCategory)

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-full z-50 mt-2 w-[420px] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rx-orange px-1.5 text-[10px] font-bold text-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={markAllRead}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="border-b border-border px-4 py-2">
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <span>
              {selectedCategory === "all"
                ? "All Categories"
                : CATEGORY_CONFIG[selectedCategory].label}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showCategories && "rotate-180"
              )}
            />
          </button>
          {showCategories && (
            <div className="mt-1 flex flex-wrap gap-1.5 pb-1">
              <button
                onClick={() => {
                  setSelectedCategory("all")
                  setShowCategories(false)
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {ALL_CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat]
                const count = notifications.filter((n) => n.category === cat).length
                const Icon = config.icon
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat)
                      setShowCategories(false)
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                    {count > 0 && (
                      <span className="ml-0.5 text-[10px] opacity-70">({count})</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const catConfig = CATEGORY_CONFIG[notification.category]
              const CatIcon = catConfig.icon

              return (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "group relative flex cursor-pointer gap-3 border-b border-border/50 border-l-2 px-4 py-3 transition-colors hover:bg-secondary/30",
                    SEVERITY_STYLES[notification.severity],
                    !notification.read && "bg-secondary/20"
                  )}
                >
                  {/* Category Icon */}
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/60",
                      catConfig.color
                    )}
                  >
                    <CatIcon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm leading-tight",
                          !notification.read
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/80"
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rx-orange" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {notification.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                          "bg-secondary/80 text-muted-foreground"
                        )}
                      >
                        {catConfig.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatRelativeTime(notification.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dismissNotification(notification.id)
                    }}
                    className="mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-secondary hover:text-foreground group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-center">
            <p className="text-[11px] text-muted-foreground/60">
              Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
