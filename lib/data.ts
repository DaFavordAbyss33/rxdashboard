import type { Bot, Installation, Guild, Incident, BotConfig } from "./types"

// Mock bot registry - in production this would come from your database
export const bots: Bot[] = [
  {
    id: "syruprx",
    name: "SyrupRx",
    description: "Maple Hospital utility and staff management bot",
    icon: "/bots/syruprx.png",
    clientId: "1234567890123456789",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["staffLogs", "modLogs", "shiftLogs"],
      keys: ["marizmaApiKey", "robloxGroupId"],
      features: ["shiftTracker", "roleSync", "moderation"],
      premium: true,
    },
    status: "online",
    guildsCount: 182,
    wsPing: 64,
    uptime: "7d 12h 34m",
    lastIncident: {
      id: "inc-1",
      botId: "syruprx",
      type: "error",
      message: "Failed to sync roles for guild 123456789",
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  },
  {
    id: "swissrx",
    name: "SwissRx",
    description: "LOA and session management system",
    icon: "/bots/swissrx.png",
    clientId: "9876543210987654321",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["loaChannel", "sessionChannel", "staffLog"],
      keys: ["googleSheetsId"],
      features: ["loa", "sessionCalendar", "staffTracking"],
      premium: false,
    },
    isPrivate: true, // Custom bot - cannot be added to other servers
    status: "online",
    guildsCount: 1, // Only in one server
    wsPing: 52,
    uptime: "3d 8h 15m",
  },
  {
    id: "autoclockrx",
    name: "AutoclockRx",
    description: "Automatic shift logging with MarizmaAPI",
    icon: "/bots/autoclockrx.png",
    clientId: "1357924680135792468",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["clockChannel", "reportChannel"],
      keys: ["robloxGroupId", "marizmaApiKey", "payrollWebhook"],
      features: ["autoClock", "payrollExport", "activityMonitor", "shiftSchedules"],
      premium: true,
    },
    hasSubscription: true,
    status: "degraded",
    guildsCount: 67,
    wsPing: 128,
    uptime: "1d 2h 45m",
    lastIncident: {
      id: "inc-2",
      botId: "autoclockrx",
      type: "warning",
      message: "High latency detected",
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  },
  {
    id: "mednoterx",
    name: "MedNoteRx",
    description: "Discord patient charting and medical documentation",
    icon: "/bots/mednoterx.png",
    clientId: "2468135790246813579",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["alertChannel", "logChannel", "chartingChannel"],
      keys: ["webhookUrl", "emrApiKey"],
      features: ["patientCharting", "alerts", "scheduling", "exportReports"],
      premium: true,
    },
    hasSubscription: true,
    status: "offline",
    guildsCount: 23,
    wsPing: 0,
    uptime: "0d 0h 0m",
lastIncident: {
      id: "inc-3",
      botId: "mednoterx",
      type: "error",
      message: "Bot disconnected unexpectedly",
      createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
  },
  {
    id: "syruprx-pro",
    name: "SyrupRx PRO",
    description: "Premium features and advanced analytics",
    icon: "/bots/syruprx-pro.png",
    clientId: "1122334455667788990",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["analyticsChannel", "premiumLogs"],
      keys: ["stripeCustomerId", "analyticsKey"],
      features: ["premiumGate", "analytics", "customBranding"],
      premium: true,
    },
    hasSubscription: true,
    status: "online",
    guildsCount: 156,
    wsPing: 45,
    uptime: "14d 6h 22m",
  },
]

// Mock installations data
export const installations: Installation[] = [
  {
    botId: "syruprx",
    guildId: "guild-1",
    guildName: "Maple Community",
    guildIcon: null,
    installedAt: "2025-06-15T10:30:00Z",
    lastSeenAt: new Date().toISOString(),
    premiumStatus: "active",
  },
  {
    botId: "syruprx",
    guildId: "guild-2",
    guildName: "Dev Server",
    guildIcon: null,
    installedAt: "2025-08-20T14:45:00Z",
    lastSeenAt: new Date().toISOString(),
    premiumStatus: "trial",
  },
  {
    botId: "swissrx",
    guildId: "guild-1",
    guildName: "Maple Community",
    guildIcon: null,
    installedAt: "2025-07-01T09:00:00Z",
    lastSeenAt: new Date().toISOString(),
    // SwissRx is a private bot - only installed on this one server
  },
  {
    botId: "syruprx-pro",
    guildId: "guild-2",
    guildName: "Dev Server",
    guildIcon: null,
    installedAt: "2025-09-10T16:20:00Z",
    lastSeenAt: new Date().toISOString(),
    premiumStatus: "active",
  },
]

// Mock user guilds (simulates Discord API response)
export const guilds: Guild[] = [
  {
    id: "guild-1",
    name: "Maple Community",
    icon: null,
    memberCount: 1250,
    owner: true,
    permissions: "2147483647", // Administrator
  },
  {
    id: "guild-2",
    name: "Dev Server",
    icon: null,
    memberCount: 45,
    owner: true,
    permissions: "2147483647",
  },
  {
    id: "guild-3",
    name: "Testing Ground",
    icon: null,
    memberCount: 120,
    owner: false,
    permissions: "32", // Manage Guild
  },
]

// Mock configs
export const configs: BotConfig[] = [
  {
    botId: "syruprx",
    guildId: "guild-1",
    config: {
      staffLogs: "1234567890",
      modLogs: "1234567891",
      marizmaApiKey: "••••••••abcd",
      roleSync: true,
      shiftTracker: true,
    },
    updatedBy: "user-1",
    updatedAt: "2026-01-28T12:00:00Z",
  },
]

// Mock incidents
export const incidents: Incident[] = [
  {
    id: "inc-1",
    botId: "syruprx",
    guildId: "guild-1",
    type: "error",
    message: "Failed to sync roles for guild",
    stack: "Error: Role sync failed\n    at RoleSync.execute (/src/jobs/roleSync.ts:45:11)",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "inc-2",
    botId: "autoclockrx",
    type: "warning",
    message: "High latency detected - WS ping above 100ms",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "inc-3",
    botId: "mednoterx",
    type: "error",
    message: "Bot disconnected unexpectedly",
    stack: "Error: Connection closed\n    at WebSocket.onClose (/src/client.ts:120:8)",
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "inc-4",
    botId: "swissrx",
    type: "info",
    message: "Successfully processed 150 LOA requests",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
]

// Helper functions
export function getBotById(id: string): Bot | undefined {
  return bots.find((bot) => bot.id === id)
}

export function getInstallationsForBot(botId: string): Installation[] {
  return installations.filter((i) => i.botId === botId)
}

export function getInstallationsForGuild(guildId: string): Installation[] {
  return installations.filter((i) => i.guildId === guildId)
}

export function isGuildInstalled(botId: string, guildId: string): boolean {
  return installations.some((i) => i.botId === botId && i.guildId === guildId)
}

export function getConfigForBotGuild(botId: string, guildId: string): BotConfig | undefined {
  return configs.find((c) => c.botId === botId && c.guildId === guildId)
}

export function getIncidentsForBot(botId: string): Incident[] {
  return incidents.filter((i) => i.botId === botId)
}

export function generateInviteUrl(bot: Bot, guildId?: string): string {
  const baseUrl = "https://discord.com/oauth2/authorize"
  const params = new URLSearchParams({
    client_id: bot.clientId,
    scope: bot.inviteScopes.join(" "),
    permissions: bot.permissionsInt,
  })
  
  if (guildId) {
    params.append("guild_id", guildId)
    params.append("disable_guild_select", "true")
  }
  
  return `${baseUrl}?${params.toString()}`
}

// Permission check helper
export function hasManageGuildPermission(permissions: string): boolean {
  const permInt = BigInt(permissions)
  const MANAGE_GUILD = BigInt(0x20) // 32
  const ADMINISTRATOR = BigInt(0x8) // 8
  return (permInt & MANAGE_GUILD) === MANAGE_GUILD || (permInt & ADMINISTRATOR) === ADMINISTRATOR
}
