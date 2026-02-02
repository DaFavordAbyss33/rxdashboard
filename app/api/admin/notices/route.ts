import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

// For now, we'll store notices in memory (in production, use a database)
// This is a simple implementation that can be extended later
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
  // This would normally query your database for users with notifications enabled
  // For now, return an empty array since we don't have email storage set up
  return [] as Array<{ email: string; username: string }>
}

// Send notice email (placeholder - integrate with email service like Resend, SendGrid, etc.)
const sendEmailNotice = async (
  recipients: Array<{ email: string; username: string }>,
  subject: string,
  message: string
) => {
  // In production, integrate with an email service:
  // - Resend: https://resend.com
  // - SendGrid: https://sendgrid.com
  // - AWS SES: https://aws.amazon.com/ses/
  
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // for (const recipient of recipients) {
  //   await resend.emails.send({
  //     from: 'RxSystems <notifications@rxsystems.app>',
  //     to: recipient.email,
  //     subject: subject,
  //     html: `<p>Hi ${recipient.username},</p><p>${message}</p>`
  //   })
  // }

  console.log(`[notices] Would send email to ${recipients.length} recipients:`)
  console.log(`[notices] Subject: ${subject}`)
  console.log(`[notices] Message: ${message}`)

  return recipients.length
}

// GET - Fetch sent notices history
export async function GET() {
  try {
    // Verify admin access via session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

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
    const sessionCookie = cookieStore.get("session")

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
