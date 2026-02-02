// Admin role configuration
export const ADMIN_CONFIG = {
  guildId: "1434823891141787703",
  roleId: "1467690264779817021",
} as const

// Check if user has admin role in the specified guild
export async function checkAdminRole(accessToken: string): Promise<boolean> {
  try {
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
