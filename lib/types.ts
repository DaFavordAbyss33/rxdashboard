// Bot types
export interface Bot {
  id: string
  name: string
  description: string
  icon: string
  clientId: string
  inviteScopes: string[]
  permissionsInt: string
  capabilities: BotCapabilities
  status: "online" | "offline" | "degraded"
  guildsCount: number
  wsPing: number
  uptime: string
  lastIncident?: Incident
  hasSubscription?: boolean
  isPrivate?: boolean // Private bots cannot be added to other servers
}

export interface BotCapabilities {
  channels?: string[]
  keys?: string[]
  features?: string[]
  premium?: boolean
}

// Guild types
export interface Guild {
  id: string
  name: string
  icon: string | null
  memberCount?: number
  owner: boolean
  permissions: string
  memberRoles?: string[]
}

export interface Installation {
  botId: string
  guildId: string
  guildName: string
  guildIcon: string | null
  installedAt: string
  lastSeenAt: string
  premiumStatus?: "active" | "inactive" | "trial"
}

export interface BotConfig {
  botId: string
  guildId: string
  config: Record<string, unknown>
  updatedBy?: string
  updatedAt?: string
}

// Incident/Log types
export interface Incident {
  id: string
  botId: string
  guildId?: string
  type: "error" | "warning" | "info"
  message: string
  stack?: string
  createdAt: string
}

// Audit log types
export interface AuditLog {
  id: string
  botId: string
  guildId: string
  actorId: string
  actorTag: string
  action: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  createdAt: string
}

// User/Session types
export interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
  guilds: Guild[]
}
