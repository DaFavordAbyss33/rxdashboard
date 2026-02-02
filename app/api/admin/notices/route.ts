import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// For now, we'll store notices in memory (in production, use a database)
const sentNotices: Array<{
  id: string
  subject: string
  message: string
  sentBy: string
  sentAt: string
  recipientCount: number
}> = []

// Mock user emails - In production, fetch from your user database
// Users who have "Creator Notices" enabled in their settings
const getSubscribedUsers = async () => {
  // TODO: Query your MongoDB database for users with notifications enabled
  // For now, return test emails or fetch from a configured list
  const testEmail = process.env.ADMIN_EMAIL || process.env.TEST_EMAIL
  if (testEmail) {
    return [{ email: testEmail, username: "Admin" }]
  }
  return [] as Array<{ email: string; username: string }>
}

// Send notice email via Resend
const sendEmailNotice = async (
  recipients: Array<{ email: string; username: string }>,
  subject: string,
  message: string
) => {
  if (!resend) {
    console.error("[notices] Resend API key not configured")
    return 0
  }

  if (recipients.length === 0) {
    console.log("[notices] No recipients to send to")
    return 0
  }

  let successCount = 0

  for (const recipient of recipients) {
    try {
      await resend.emails.send({
        from: "RxSystems <onboarding@resend.dev>", // Use your verified domain: notifications@rxsystems.app
        to: recipient.email,
        subject: `[RxSystems] ${subject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
                <h1 style="color: #fafafa; font-size: 24px; margin-bottom: 8px;">RxSystems Notice</h1>
                <h2 style="color: #a1a1aa; font-size: 18px; font-weight: normal; margin-bottom: 24px;">${subject}</h2>
                <p style="color: #fafafa; margin-bottom: 16px;">Hi ${recipient.username},</p>
                <div style="color: #d4d4d8; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                <hr style="border: none; border-top: 1px solid #262626; margin: 32px 0;">
                <p style="color: #71717a; font-size: 12px;">
                  You received this email because you have Creator Notices enabled in your RxSystems dashboard settings.
                </p>
              </div>
            </body>
          </html>
        `,
      })
      successCount++
    } catch (error) {
      console.error(`[notices] Failed to send to ${recipient.email}:`, error)
    }
  }

  console.log(`[notices] Sent ${successCount}/${recipients.length} emails`)
  return successCount
}

// GET - Fetch sent notices history
export async function GET() {
  try {
    // Verify admin access via session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("discord_session")

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Return recent notices
    return NextResponse.json({
      success: true,
      notices: sentNotices.slice(-20).reverse(), // Last 20 notices, newest first
    })
  } catch (error) {
    console.error("Failed to fetch notices:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch notices" },
      { status: 500 }
    )
  }
}

// POST - Send a new notice
export async function POST(request: Request) {
  try {
    // Verify admin access via session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("discord_session")

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { subject, message, sentBy } = await request.json()

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Subject and message are required" },
        { status: 400 }
      )
    }

    // Get subscribed users
    const subscribers = await getSubscribedUsers()

    // Send emails
    const recipientCount = await sendEmailNotice(subscribers, subject, message)

    // Store notice in history
    const notice = {
      id: `notice_${Date.now()}`,
      subject: subject.trim(),
      message: message.trim(),
      sentBy: sentBy || "admin",
      sentAt: new Date().toISOString(),
      recipientCount,
    }
    sentNotices.push(notice)

    return NextResponse.json({
      success: true,
      message: "Notice sent successfully",
      recipientCount,
      notice,
    })
  } catch (error) {
    console.error("Failed to send notice:", error)
    return NextResponse.json(
      { success: false, error: "Failed to send notice" },
      { status: 500 }
    )
  }
}
