import { NextResponse } from "next/server"
import { Resend } from "resend"
import { BOT_DATABASES, BotId, getBotDatabase, isBotConfigured } from "@/lib/mongodb"

export const dynamic = "force-dynamic"

// Use full access key for contacts management
const resend = new Resend(process.env.RESEND_FULL_ACCESS)

// Audience ID for newsletter subscribers - set this in your environment
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || ""

interface UserWithNotices {
  discordId: string
  username: string
  email?: string
  creatorNoticesEnabled?: boolean
  createdAt?: string
}

// Fetch users with creator notices enabled from all bot databases
async function getSubscribedUsers(): Promise<UserWithNotices[]> {
  const allUsers: UserWithNotices[] = []
  
  for (const botId of Object.keys(BOT_DATABASES) as BotId[]) {
    if (!isBotConfigured(botId)) continue
    
    try {
      const db = await getBotDatabase(botId)
      if (!db) continue
      
      // Try to find users collection with notification preferences
      const usersCollection = db.collection("users")
      
      const users = await usersCollection
        .find({
          $or: [
            { creatorNoticesEnabled: true },
            { "notifications.creatorNotices": true },
            { "settings.creatorNotices": true },
          ],
          email: { $exists: true, $ne: null, $ne: "" },
        })
        .toArray()
      
      for (const user of users) {
        // Avoid duplicates by checking discordId
        if (!allUsers.some((u) => u.discordId === user.discordId)) {
          allUsers.push({
            discordId: user.discordId || user._id.toString(),
            username: user.username || user.displayName || "User",
            email: user.email,
            creatorNoticesEnabled: true,
            createdAt: user.createdAt?.toISOString?.() || new Date().toISOString(),
          })
        }
      }
    } catch (error) {
      console.error(`[contacts] Failed to fetch users from ${botId}:`, error)
    }
  }
  
  return allUsers
}

// GET - List contacts from Resend
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const email = searchParams.get("email")
    const contactId = searchParams.get("contactId")
    const limit = searchParams.get("limit")

    // Get single contact by email or ID
    if (action === "get" && (email || contactId)) {
      if (!AUDIENCE_ID) {
        return NextResponse.json(
          { success: false, error: "RESEND_AUDIENCE_ID not configured" },
          { status: 500 }
        )
      }

      const contact = email
        ? await resend.contacts.get({ audienceId: AUDIENCE_ID, email })
        : await resend.contacts.get({ audienceId: AUDIENCE_ID, id: contactId! })

      return NextResponse.json({ success: true, contact: contact.data })
    }

    // Fetch subscribed users from database
    if (action === "subscribed") {
      const users = await getSubscribedUsers()
      return NextResponse.json({ success: true, users, count: users.length })
    }

    // List contacts from Resend
    if (!AUDIENCE_ID) {
      return NextResponse.json(
        { success: false, error: "RESEND_AUDIENCE_ID not configured" },
        { status: 500 }
      )
    }

    const contacts = await resend.contacts.list({
      audienceId: AUDIENCE_ID,
      ...(limit ? { limit: parseInt(limit, 10) } : {}),
    })

    return NextResponse.json({ success: true, contacts: contacts.data })
  } catch (error) {
    console.error("[contacts] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch contacts" },
      { status: 500 }
    )
  }
}

// POST - Create contact or sync all subscribed users
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, email, firstName, lastName, unsubscribed } = body

    if (!AUDIENCE_ID) {
      return NextResponse.json(
        { success: false, error: "RESEND_AUDIENCE_ID not configured" },
        { status: 500 }
      )
    }

    // Sync all subscribed users to Resend
    if (action === "sync") {
      const users = await getSubscribedUsers()
      
      let created = 0
      let updated = 0
      let failed = 0
      const errors: string[] = []

      for (const user of users) {
        if (!user.email) continue

        try {
          // Try to get existing contact
          const existing = await resend.contacts.get({
            audienceId: AUDIENCE_ID,
            email: user.email,
          })

          if (existing.data) {
            // Update existing contact
            await resend.contacts.update({
              audienceId: AUDIENCE_ID,
              id: existing.data.id,
              firstName: user.username,
              unsubscribed: false,
            })
            updated++
          } else {
            // Create new contact
            await resend.contacts.create({
              audienceId: AUDIENCE_ID,
              email: user.email,
              firstName: user.username,
              unsubscribed: false,
            })
            created++
          }
        } catch (error) {
          // If get fails, try to create
          try {
            await resend.contacts.create({
              audienceId: AUDIENCE_ID,
              email: user.email,
              firstName: user.username,
              unsubscribed: false,
            })
            created++
          } catch (createError) {
            failed++
            errors.push(`${user.email}: ${createError instanceof Error ? createError.message : "Unknown error"}`)
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Sync complete: ${created} created, ${updated} updated, ${failed} failed`,
        stats: { created, updated, failed, total: users.length },
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Show first 10 errors
      })
    }

    // Create single contact
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      )
    }

    const result = await resend.contacts.create({
      audienceId: AUDIENCE_ID,
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      unsubscribed: unsubscribed || false,
    })

    return NextResponse.json({
      success: true,
      contact: result.data,
      message: "Contact created successfully",
    })
  } catch (error) {
    console.error("[contacts] Error creating contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create contact" },
      { status: 500 }
    )
  }
}

// PUT - Update a contact
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { contactId, email, firstName, lastName, unsubscribed } = body

    if (!AUDIENCE_ID) {
      return NextResponse.json(
        { success: false, error: "RESEND_AUDIENCE_ID not configured" },
        { status: 500 }
      )
    }

    if (!contactId && !email) {
      return NextResponse.json(
        { success: false, error: "contactId or email is required" },
        { status: 400 }
      )
    }

    const updateData: {
      audienceId: string
      id?: string
      email?: string
      firstName?: string
      lastName?: string
      unsubscribed?: boolean
    } = {
      audienceId: AUDIENCE_ID,
    }

    if (contactId) updateData.id = contactId
    if (email) updateData.email = email
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (unsubscribed !== undefined) updateData.unsubscribed = unsubscribed

    await resend.contacts.update(updateData)

    return NextResponse.json({
      success: true,
      message: "Contact updated successfully",
    })
  } catch (error) {
    console.error("[contacts] Error updating contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update contact" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a contact
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get("contactId")
    const email = searchParams.get("email")

    if (!AUDIENCE_ID) {
      return NextResponse.json(
        { success: false, error: "RESEND_AUDIENCE_ID not configured" },
        { status: 500 }
      )
    }

    if (!contactId && !email) {
      return NextResponse.json(
        { success: false, error: "contactId or email query parameter is required" },
        { status: 400 }
      )
    }

    if (contactId) {
      await resend.contacts.remove({ audienceId: AUDIENCE_ID, id: contactId })
    } else if (email) {
      await resend.contacts.remove({ audienceId: AUDIENCE_ID, email })
    }

    return NextResponse.json({
      success: true,
      message: "Contact deleted successfully",
    })
  } catch (error) {
    console.error("[contacts] Error deleting contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete contact" },
      { status: 500 }
    )
  }
}
