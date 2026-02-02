import { NextResponse } from "next/server"
import { buildNewsletter } from "@/lib/email-templates/newsletter-builder"
import { NewsletterContent } from "@/lib/email-templates/components"

export const dynamic = "force-dynamic"

// POST - Generate HTML preview from content
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { content } = body as { content: Partial<NewsletterContent> }

    const html = buildNewsletter(content || {})

    return NextResponse.json({
      success: true,
      html,
    })
  } catch (error) {
    console.error("[templates/preview] Error generating preview:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate preview" },
      { status: 500 }
    )
  }
}
