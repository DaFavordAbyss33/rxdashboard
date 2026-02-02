import { NextResponse } from "next/server"
import { getRecentIncidents, BOT_DATABASES, type BotId } from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const botIdParam = searchParams.get("botId")
    const limit = limitParam ? parseInt(limitParam, 10) : 20

    const botIds = botIdParam 
      ? [botIdParam as BotId]
      : Object.keys(BOT_DATABASES) as BotId[]

    // Fetch incidents from all bot databases
    const allIncidents = await Promise.all(
      botIds.map((botId) => getRecentIncidents(botId, limit))
    )

    // Flatten and sort by date
    const incidents = allIncidents
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)

    return NextResponse.json({
      incidents,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch incidents:", error)
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    )
  }
}
