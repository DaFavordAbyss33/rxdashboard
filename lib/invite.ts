// Discord OAuth2 invite URL builder for bots

export interface BotInviteParams {
  clientId: string
  permissions?: string
  scopes?: string[]
  guildId?: string
  disableGuildSelect?: boolean
}

// Default permissions for bots (Administrator = 8)
const DEFAULT_PERMISSIONS = "8"

// Default scopes for bot invites
const DEFAULT_SCOPES = ["bot", "applications.commands"]

/**
 * Generate a Discord OAuth2 invite URL for a bot
 */
export function generateInviteUrl({
  clientId,
  permissions = DEFAULT_PERMISSIONS,
  scopes = DEFAULT_SCOPES,
  guildId,
  disableGuildSelect = true,
}: BotInviteParams): string {
  const baseUrl = "https://discord.com/oauth2/authorize"
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes.join(" "),
    permissions,
  })

  if (guildId) {
    params.append("guild_id", guildId)
    if (disableGuildSelect) {
      params.append("disable_guild_select", "true")
    }
  }

  return `${baseUrl}?${params.toString()}`
}

/**
 * Generate invite URL from bot data object
 */
export function generateBotInviteUrl(
  bot: {
    clientId: string
    inviteScopes?: string[]
    permissionsInt?: string
    isPrivate?: boolean
  },
  guildId?: string
): string | null {
  // Private bots cannot be invited to other servers
  if (bot.isPrivate) {
    return null
  }

  return generateInviteUrl({
    clientId: bot.clientId,
    permissions: bot.permissionsInt || DEFAULT_PERMISSIONS,
    scopes: bot.inviteScopes || DEFAULT_SCOPES,
    guildId,
    disableGuildSelect: !!guildId,
  })
}

/**
 * Check if a bot can be invited (not private)
 */
export function canInviteBot(bot: { isPrivate?: boolean }): boolean {
  return !bot.isPrivate
}
