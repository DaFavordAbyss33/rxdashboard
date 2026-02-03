// Admin role configuration
export const ADMIN_CONFIG = {
  guildId: "1434823891141787703",
  roleId: "1467690264779817021",
  // Master user ID - always has full access
  masterId: "1051632965203005490",
} as const

// Check if user is the master user (full access to everything)
export function isMasterUser(userId: string): boolean {
  return userId === ADMIN_CONFIG.masterId
}

// Check if user has admin role in the specified guild (or is master user)
export async function checkAdminRole(accessToken: string, userId?: string): Promise<boolean> {
  try {
    // Master user always has admin access
    if (userId && isMasterUser(userId)) {
      return true
    }

    // Get user's guild member info for the admin guild
    const response = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${ADMIN_CONFIG.guildId}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      // User is not in the guild
      if (response.status === 404) {
        return false
      }
      console.error("Failed to check admin role:", response.status)
      return false
    }

    const memberData = await response.json()
    
    // Check if user has the admin role
    return memberData.roles?.includes(ADMIN_CONFIG.roleId) ?? false
  } catch (error) {
    console.error("Error checking admin role:", error)
    return false
  }
}

// Protected admin routes
export const ADMIN_ROUTES = ["/dashboard", "/dashboard/admin"]

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || (route === "/dashboard" && pathname === "/dashboard")
  )
}
