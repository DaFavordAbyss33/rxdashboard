import { NextResponse } from "next/server"
import { BOT_DATABASES, getBotDatabase, isBotConfigured, type BotId } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// Get bot settings from MongoDB
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const botId = searchParams.get("botId") as BotId | null

    if (!botId) {
      return NextResponse.json(
        { success: false, error: "Bot ID is required" },
        { status: 400 }
      )
    }

    if (!isBotConfigured(botId)) {
      return NextResponse.json({
        success: true,
        settings: {
          botId,
          configured: false,
          settings: {},
        },
      })
    }

    const db = await getBotDatabase(botId)
    if (!db) {
      return NextResponse.json({
        success: true,
        settings: {
          botId,
          configured: false,
          settings: {},
        },
      })
    }

    const settingsCollection = db.collection("settings")
    const settings = await settingsCollection.findOne({ type: "global" })

    return NextResponse.json({
      success: true,
      settings: {
        botId,
        configured: true,
        settings: settings?.data || {},
      },
    })
  } catch (error) {
    console.error("Failed to fetch bot settings:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

// Update bot settings in MongoDB
export async function POST(request: Request) {
  try {
    const { botId, settings } = await request.json()

    if (!botId) {
      return NextResponse.json(
        { success: false, error: "Bot ID is required" },
        { status: 400 }
      )
    }

    if (!isBotConfigured(botId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
      )
    }

    const db = await getBotDatabase(botId)
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Failed to connect to database" },
        { status: 500 }
      )
    }

    const settingsCollection = db.collection("settings")
    await settingsCollection.updateOne(
      { type: "global" },
      { 
        $set: { 
          data: settings,
          updatedAt: new Date().toISOString(),
        } 
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    })
  } catch (error) {
    console.error("Failed to update bot settings:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
