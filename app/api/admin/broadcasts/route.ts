import { NextResponse } from "next/server"
import { Resend } from "resend"
import { buildNewsletter } from "@/lib/email-templates/newsletter-builder"
import { getNewsletterIssue } from "@/lib/newsletterMeta"

const resend = new Resend(process.env.RESEND_FULL_ACCESS)
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID

// GET - List broadcasts or get a specific broadcast
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const broadcastId = searchParams.get("broadcastId")

    // Get single broadcast by ID
    if (broadcastId) {
      const broadcast = await resend.broadcasts.get(broadcastId)
      return NextResponse.json({ success: true, broadcast: broadcast.data })
    }

    // List all broadcasts
    const broadcasts = await resend.broadcasts.list()
    return NextResponse.json({ success: true, broadcasts: broadcasts.data })
  } catch (error) {
    console.error("[broadcasts] Error fetching broadcasts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch broadcasts" },
      { status: 500 }
    )
  }
}

// POST - Create or send a broadcast
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, broadcastId, content, subject, scheduledAt } = body

    // Send an existing broadcast
    if (action === "send" && broadcastId) {
      const result = await resend.broadcasts.send(broadcastId, {
        ...(scheduledAt && { scheduledAt }),
      })
      return NextResponse.json({
        success: true,
        message: scheduledAt ? `Broadcast scheduled for ${scheduledAt}` : "Broadcast sent",
        data: result.data,
      })
    }

    // Create a new broadcast
    if (action === "create") {
      if (!AUDIENCE_ID) {
        return NextResponse.json(
          { success: false, error: "RESEND_AUDIENCE_ID not configured" },
          { status: 500 }
        )
      }

      const { MONTH, YEAR, ISSUE } = getNewsletterIssue()
      
      // Build newsletter HTML from content or use default
      const html = content 
        ? buildNewsletter(content)
        : buildNewsletter({})

      // Add unsubscribe link placeholder for broadcasts
      const htmlWithUnsubscribe = html.replace(
        '</body>',
        '<p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">You can unsubscribe here: {{{RESEND_UNSUBSCRIBE_URL}}}</p></body>'
      )

      const result = await resend.broadcasts.create({
        audienceId: AUDIENCE_ID,
        from: "Rx Systems <newsletter@rxdev.org>",
        subject: subject || `Rx Systems Newsletter — ${MONTH} ${YEAR} (Issue ${ISSUE})`,
        html: htmlWithUnsubscribe,
      })

      return NextResponse.json({
        success: true,
        message: "Broadcast created successfully",
        broadcastId: result.data?.id,
      })
    }

    // Create and send immediately
    if (action === "createAndSend") {
      if (!AUDIENCE_ID) {
        return NextResponse.json(
          { success: false, error: "RESEND_AUDIENCE_ID not configured" },
          { status: 500 }
        )
      }

      const { MONTH, YEAR, ISSUE } = getNewsletterIssue()
      
      const html = content 
        ? buildNewsletter(content)
        : buildNewsletter({})

      const htmlWithUnsubscribe = html.replace(
        '</body>',
        '<p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">You can unsubscribe here: {{{RESEND_UNSUBSCRIBE_URL}}}</p></body>'
      )

      // Create the broadcast
      const createResult = await resend.broadcasts.create({
        audienceId: AUDIENCE_ID,
        from: "Rx Systems <newsletter@rxdev.org>",
        subject: subject || `Rx Systems Newsletter — ${MONTH} ${YEAR} (Issue ${ISSUE})`,
        html: htmlWithUnsubscribe,
      })

      if (!createResult.data?.id) {
        return NextResponse.json(
          { success: false, error: "Failed to create broadcast" },
          { status: 500 }
        )
      }

      // Send it
      await resend.broadcasts.send(createResult.data.id, {
        ...(scheduledAt && { scheduledAt }),
      })

      return NextResponse.json({
        success: true,
        message: scheduledAt 
          ? `Broadcast created and scheduled for ${scheduledAt}` 
          : "Broadcast created and sent",
        broadcastId: createResult.data.id,
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'create', 'send', or 'createAndSend'" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[broadcasts] Error with broadcast:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process broadcast" },
      { status: 500 }
    )
  }
}

// PUT - Update a broadcast
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { broadcastId, subject, content } = body

    if (!broadcastId) {
      return NextResponse.json(
        { success: false, error: "broadcastId is required" },
        { status: 400 }
      )
    }

    const updateData: { subject?: string; html?: string } = {}
    
    if (subject) updateData.subject = subject
    if (content) {
      const html = buildNewsletter(content)
      const htmlWithUnsubscribe = html.replace(
        '</body>',
        '<p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">You can unsubscribe here: {{{RESEND_UNSUBSCRIBE_URL}}}</p></body>'
      )
      updateData.html = htmlWithUnsubscribe
    }

    await resend.broadcasts.update(broadcastId, updateData)

    return NextResponse.json({
      success: true,
      message: "Broadcast updated successfully",
    })
  } catch (error) {
    console.error("[broadcasts] Error updating broadcast:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update broadcast" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a broadcast
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const broadcastId = searchParams.get("broadcastId")

    if (!broadcastId) {
      return NextResponse.json(
        { success: false, error: "broadcastId query parameter is required" },
        { status: 400 }
      )
    }

    await resend.broadcasts.remove(broadcastId)

    return NextResponse.json({
      success: true,
      message: "Broadcast deleted successfully",
    })
  } catch (error) {
    console.error("[broadcasts] Error deleting broadcast:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete broadcast" },
      { status: 500 }
    )
  }
}
