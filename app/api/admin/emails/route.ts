import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_FULL_ACCESS)

// GET - List emails or get a specific email
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get("emailId")

    // Get single email by ID
    if (emailId) {
      const email = await resend.emails.get(emailId)
      return NextResponse.json({ success: true, email: email.data })
    }

    // List all emails
    const emails = await resend.emails.list()
    return NextResponse.json({ success: true, emails: emails.data })
  } catch (error) {
    console.error("[emails] Error fetching emails:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch emails" },
      { status: 500 }
    )
  }
}

// POST - Send email or batch emails
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, emails, email, scheduledAt } = body

    // Send batch emails
    if (action === "batch" && emails && Array.isArray(emails)) {
      const result = await resend.batch.send(emails)
      return NextResponse.json({
        success: true,
        message: `Batch of ${emails.length} emails sent`,
        data: result.data,
      })
    }

    // Send single email
    if (email) {
      const result = await resend.emails.send({
        from: email.from || "Rx Systems <newsletter@rxdev.org>",
        to: email.to,
        subject: email.subject,
        html: email.html,
        ...(scheduledAt && { scheduledAt }),
      })
      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        emailId: result.data?.id,
      })
    }

    return NextResponse.json(
      { success: false, error: "Missing email data" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[emails] Error sending email:", error)
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 500 }
    )
  }
}

// PUT - Update a scheduled email
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { emailId, scheduledAt } = body

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: "emailId is required" },
        { status: 400 }
      )
    }

    await resend.emails.update({
      id: emailId,
      scheduledAt,
    })

    return NextResponse.json({
      success: true,
      message: "Email updated successfully",
    })
  } catch (error) {
    console.error("[emails] Error updating email:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update email" },
      { status: 500 }
    )
  }
}

// DELETE - Cancel a scheduled email
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get("emailId")

    if (!emailId) {
      return NextResponse.json(
        { success: false, error: "emailId query parameter is required" },
        { status: 400 }
      )
    }

    await resend.emails.cancel(emailId)

    return NextResponse.json({
      success: true,
      message: "Email cancelled successfully",
    })
  } catch (error) {
    console.error("[emails] Error cancelling email:", error)
    return NextResponse.json(
      { success: false, error: "Failed to cancel email" },
      { status: 500 }
    )
  }
}
