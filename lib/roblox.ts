// Roblox API helper utilities for fetching user data, headshots, and usernames

const USERS_API = "https://users.roblox.com"
const THUMBS_API = "https://thumbnails.roblox.com"

export interface RobloxUser {
  id: number
  name: string
  displayName: string
  hasVerifiedBadge?: boolean
}

export interface RobloxThumbnail {
  targetId: number
  state: string
  imageUrl: string | null
}

// Fetch user info by ID
export async function getUserById(userId: number): Promise<RobloxUser | null> {
  try {
    const res = await fetch(`${USERS_API}/v1/users/${userId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Batch fetch users by IDs (max 100 per request)
export async function getUsersByIds(userIds: number[]): Promise<RobloxUser[]> {
  if (userIds.length === 0) return []
  
  try {
    const res = await fetch(`${USERS_API}/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, excludeBannedUsers: false }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.data || []
  } catch {
    return []
  }
}

// Fetch user by username
export async function getUserByUsername(username: string): Promise<RobloxUser | null> {
  try {
    const res = await fetch(`${USERS_API}/v1/usernames/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.[0] || null
  } catch {
    return null
  }
}

// Get avatar headshot URL
export async function getHeadshotUrl(
  userId: number,
  size: "48x48" | "60x60" | "75x75" | "100x100" | "150x150" | "180x180" | "352x352" | "420x420" = "150x150"
): Promise<string | null> {
  try {
    const url = new URL(`${THUMBS_API}/v1/users/avatar-headshot`)
    url.searchParams.set("userIds", String(userId))
    url.searchParams.set("size", size)
    url.searchParams.set("format", "Png")
    url.searchParams.set("isCircular", "false")
    
    const res = await fetch(url.toString())
    if (!res.ok) return null
    
    const data = await res.json()
    return data.data?.[0]?.imageUrl || null
  } catch {
    return null
  }
}

// Batch fetch headshot URLs (max 100 per request)
export async function getHeadshotUrls(
  userIds: number[],
  size: "48x48" | "60x60" | "75x75" | "100x100" | "150x150" | "180x180" | "352x352" | "420x420" = "48x48"
): Promise<Record<number, string>> {
  if (userIds.length === 0) return {}
  
  try {
    const url = new URL(`${THUMBS_API}/v1/users/avatar-headshot`)
    url.searchParams.set("userIds", userIds.join(","))
    url.searchParams.set("size", size)
    url.searchParams.set("format", "Png")
    url.searchParams.set("isCircular", "false")
    
    const res = await fetch(url.toString())
    if (!res.ok) return {}
    
    const data = await res.json()
    const result: Record<number, string> = {}
    
    for (const item of data.data || []) {
      if (item.imageUrl) {
        result[item.targetId] = item.imageUrl
      }
    }
    
    return result
  } catch {
    return {}
  }
}

// Format display name with username: "DisplayName (@username)" or just "username"
export function formatUsername(user: RobloxUser): string {
  if (user.displayName && user.displayName !== user.name) {
    return `${user.displayName} (@${user.name})`
  }
  return user.name
}

// Resolve identifier to user ID (can be username or ID)
export async function resolveUserId(identifier: string): Promise<number | null> {
  // Check if it's already a numeric ID
  const numericId = parseInt(identifier, 10)
  if (!isNaN(numericId) && numericId > 0) {
    return numericId
  }
  
  // Otherwise, look up by username
  const user = await getUserByUsername(identifier)
  return user?.id || null
}
