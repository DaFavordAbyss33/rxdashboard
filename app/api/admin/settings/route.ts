import { NextResponse } from "next/server"
import { 
  isBotConfigured, 
  getBotSettings, 
  updateBotSettings,
  type BotId 
} from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// Default settings for a bot
const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  debugLogging: false,
  autoRestart: true,
  customStatus: "",
  commandPrefix: "!",
  enabledFeatures: [],
}

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
          data: DEFAULT_SETTINGS,
        },
      })
    }

    const settings = await getBotSettings(botId)

    return NextResponse.json({
      success: true,
      settings: {
        botId,
        configured: true,
        data: settings || DEFAULT_SETTINGS,
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

// Update bot settings in MongoDB - bots will pick up changes
export async function POST(request: Request) {
  try {
    const { botId, settings, updatedBy } = await request.json()

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

    const success = await updateBotSettings(botId, settings, updatedBy)
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to update settings" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully. Bot will sync automatically.",
    })
  } catch (error) {
    console.error("Failed to update bot settings:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
