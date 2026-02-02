import { NextResponse } from "next/server"
import { 
  isBotConfigured, 
  getPendingCommands,
  completeCommand,
  type BotId 
} from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// Get pending commands for a bot (bot polls this endpoint)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const botId = searchParams.get("botId") as BotId | null
    const apiKey = request.headers.get("x-api-key")

    if (!botId) {
      return NextResponse.json(
        { success: false, error: "Bot ID is required" },
        { status: 400 }
      )
    }

    // Simple API key validation (bot should send a secret key)
    const expectedKey = process.env[`BOT_API_KEY_${botId.toUpperCase().replace(/-/g, "_")}`]
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isBotConfigured(botId)) {
      return NextResponse.json({
        success: true,
        commands: [],
        configured: false,
      })
    }

    const commands = await getPendingCommands(botId, 10)

    return NextResponse.json({
      success: true,
      commands: commands.map(cmd => ({
        id: cmd._id.toString(),
        type: cmd.type,
        data: cmd.data,
        priority: cmd.priority,
        createdAt: cmd.createdAt,
      })),
      configured: true,
    })
  } catch (error) {
    console.error("Failed to fetch bot commands:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch commands" },
      { status: 500 }
    )
  }
}

// Mark a command as completed (bot calls this after processing)
export async function POST(request: Request) {
  try {
    const { botId, commandId, success: wasSuccessful, error } = await request.json()
    const apiKey = request.headers.get("x-api-key")

    if (!botId || !commandId) {
      return NextResponse.json(
        { success: false, error: "Bot ID and Command ID are required" },
        { status: 400 }
      )
    }

    // Simple API key validation
    const expectedKey = process.env[`BOT_API_KEY_${botId.toUpperCase().replace(/-/g, "_")}`]
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isBotConfigured(botId)) {
      return NextResponse.json(
        { success: false, error: "Bot database not configured" },
        { status: 400 }
      )
    }

    const completed = await completeCommand(botId, commandId, {
      success: wasSuccessful,
      error,
    })

    if (!completed) {
      return NextResponse.json(
        { success: false, error: "Failed to complete command" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Command marked as completed",
    })
  } catch (error) {
    console.error("Failed to complete command:", error)
    return NextResponse.json(
      { success: false, error: "Failed to complete command" },
      { status: 500 }
    )
  }
}
