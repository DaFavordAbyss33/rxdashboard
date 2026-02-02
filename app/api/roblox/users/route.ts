import { NextResponse } from "next/server"
import { getUsersByIds, getHeadshotUrls } from "@/lib/roblox"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get("ids")
  
  if (!idsParam) {
    return NextResponse.json(
      { success: false, error: "Missing ids parameter" },
      { status: 400 }
    )
  }
  
  const userIds = idsParam
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id) && id > 0)
  
  if (userIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid user IDs provided" },
      { status: 400 }
    )
  }
  
  // Limit to 100 users per request
  const limitedIds = userIds.slice(0, 100)
  
  try {
    // Fetch users and headshots in parallel
    const [users, headshots] = await Promise.all([
      getUsersByIds(limitedIds),
      getHeadshotUrls(limitedIds, "48x48"),
    ])
    
    // Build a map of user data
    const userData: Record<number, {
      id: number
      name: string
      displayName: string
      headshot: string | null
    }> = {}
    
    for (const user of users) {
      userData[user.id] = {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        headshot: headshots[user.id] || null,
      }
    }
    
    // For any missing users (banned, deleted, etc.), add placeholder
    for (const id of limitedIds) {
      if (!userData[id]) {
        userData[id] = {
          id,
          name: `User ${id}`,
          displayName: `User ${id}`,
          headshot: headshots[id] || null,
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: userData,
    })
  } catch (error) {
    console.error("Failed to fetch Roblox users:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch user data" },
      { status: 500 }
    )
  }
}
