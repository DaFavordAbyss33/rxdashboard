import type { Bot, Installation, Guild, Incident, BotConfig } from "./types"

// Command categories and their commands for SyrupRx Free
export const SYRUPRX_COMMANDS = {
  maple: {
    name: "Maple Server",
    description: "Commands for managing your Maple game server",
    commands: [
      { name: "setbanner", description: "Set a banner for the Maple server" },
      { name: "serverqueue", description: "View the current player queue on the game server" },
      { name: "announce", description: "Send an announcement to the game server" },
      { name: "serverplayers", description: "List the players currently on the server" },
      { name: "serverfunctionconfig", description: "Configure server startup/shutdown settings" },
      { name: "shutdown", description: "Shut down the Maple game server immediately" },
      { name: "kickplayer", description: "Kick a Roblox player by username or userId" },
      { name: "servershutdown", description: "Shut down the server and close the session" },
      { name: "serverstartup", description: "Start the server and open the session" },
      { name: "serverinfo", description: "Get public server information from Marizma API" },
      { name: "serverbans", description: "View the current ban list on the game server" },
      { name: "banplayer", description: "Ban or unban a Roblox user" },
      { name: "setsetting", description: "Update Maple server settings (hide, private, minlevel)" },
    ],
  },
  admin: {
    name: "Admin",
    description: "Administrative and setup commands",
    commands: [
      { name: "autoreply-setup", description: "Configure message-based auto replies" },
      { name: "setup", description: "Interactive SyrupRx setup wizard" },
      { name: "stafflog-search", description: "Search staff logs by case number or username" },
      { name: "pagerconfig", description: "Start the pager setup wizard" },
      { name: "moderationlog", description: "Log an in-game moderation action" },
      { name: "demotionlog", description: "Log a staff demotion" },
      { name: "stafflog-setup", description: "Configure staff log channels and authorised roles" },
      { name: "autoannounce", description: "Configure automatic Marizma announcements" },
      { name: "promotionlog", description: "Log a staff promotion" },
    ],
  },
  utility: {
    name: "Utility",
    description: "General utility commands",
    commands: [
      { name: "pager", description: "Send a pager alert to the configured channel and server" },
    ],
  },
}

// Bot registry - SyrupRx and SwissRx only
export const bots: Bot[] = [
  {
    id: "syruprx",
    name: "SyrupRx",
    description: "Maple Hospital utility and staff management bot",
    icon: "/bots/syruprx.png",
    clientId: process.env.NEXT_PUBLIC_SYRUPRX_CLIENT_ID || "",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["staffLogs", "modLogs", "sessionChannel", "pagerChannel"],
      keys: ["marizmaApiKey", "robloxGroupId"],
      features: [
        "Server Management",
        "Staff Logging",
        "Pager System",
        "Auto Replies",
        "Auto Announcements",
        "Moderation Logs",
      ],
      premium: false,
    },
    status: "online",
    guildsCount: 0,
    wsPing: 64,
    uptime: "0d 0h 0m",
  },
  {
    id: "swissrx",
    name: "SwissRx",
    description: "Private hospital management bot for Swiss Hospital",
    icon: "/bots/swissrx.png",
    clientId: process.env.NEXT_PUBLIC_SWISSRX_CLIENT_ID || "",
    inviteScopes: ["bot", "applications.commands"],
    permissionsInt: "8",
    capabilities: {
      channels: ["staffLogs", "modLogs", "sessionChannel", "pagerChannel"],
      keys: ["marizmaApiKey", "robloxGroupId"],
      features: [
        "Server Management",
        "Staff Logging",
        "Pager System",
        "Auto Replies",
        "Auto Announcements",
        "Moderation Logs",
      ],
      premium: false,
    },
    status: "online",
    guildsCount: 0,
    wsPing: 64,
    uptime: "0d 0h 0m",
  },
]

// Local data stores (populated from database)
export const installations: Installation[] = []
export const guilds: Guild[] = []
export const configs: BotConfig[] = []
export const incidents: Incident[] = []

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

// Get all commands flat list
export function getAllCommands() {
  const allCommands: { name: string; description: string; category: string }[] = []
  
  for (const [categoryId, category] of Object.entries(SYRUPRX_COMMANDS)) {
    for (const command of category.commands) {
      allCommands.push({
        ...command,
        category: category.name,
      })
    }
  }
  
  return allCommands
}

// Get total command count
export function getCommandCount(): number {
  return Object.values(SYRUPRX_COMMANDS).reduce(
    (total, category) => total + category.commands.length,
    0
  )
}
