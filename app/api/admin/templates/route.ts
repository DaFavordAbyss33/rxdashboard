import { NextResponse } from "next/server"
import { Resend } from "resend"
import { buildNewsletter } from "@/lib/email-templates/newsletter-builder"

export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY)

// Template definitions with variables
const TEMPLATES = {
  newsletter: {
    name: "rx-newsletter",
    html: buildNewsletter({
      heroTitle: "{{{HERO_TITLE}}}",
      highlights: ["{{{HIGHLIGHT_1}}}", "{{{HIGHLIGHT_2}}}", "{{{HIGHLIGHT_3}}}", "{{{HIGHLIGHT_4}}}"],
      features: [
        {
          title: "{{{FEATURE_1_TITLE}}}",
          description: "{{{FEATURE_1_DESC}}}",
          linkUrl: "{{{FEATURE_1_URL}}}",
          linkText: "{{{FEATURE_1_LINK_TEXT}}}",
        },
        {
          title: "{{{FEATURE_2_TITLE}}}",
          description: "{{{FEATURE_2_DESC}}}",
          linkUrl: "{{{FEATURE_2_URL}}}",
          linkText: "{{{FEATURE_2_LINK_TEXT}}}",
        },
      ],
      ctaUrl: "{{{CTA_URL}}}",
      ctaText: "{{{CTA_TEXT}}}",
      footerText: "{{{FOOTER_TEXT}}}",
    }),
    variables: [
      { key: "HERO_TITLE", type: "string" as const, fallbackValue: "MONTHLY UPDATE" },
      { key: "HIGHLIGHT_1", type: "string" as const, fallbackValue: "New feature released" },
      { key: "HIGHLIGHT_2", type: "string" as const, fallbackValue: "Performance improvements" },
      { key: "HIGHLIGHT_3", type: "string" as const, fallbackValue: "Bug fixes" },
      { key: "HIGHLIGHT_4", type: "string" as const, fallbackValue: "Documentation updates" },
      { key: "FEATURE_1_TITLE", type: "string" as const, fallbackValue: "Feature One" },
      { key: "FEATURE_1_DESC", type: "string" as const, fallbackValue: "Description of feature one" },
      { key: "FEATURE_1_URL", type: "string" as const, fallbackValue: "https://rxsystems.app" },
      { key: "FEATURE_1_LINK_TEXT", type: "string" as const, fallbackValue: "Learn more" },
      { key: "FEATURE_2_TITLE", type: "string" as const, fallbackValue: "Feature Two" },
      { key: "FEATURE_2_DESC", type: "string" as const, fallbackValue: "Description of feature two" },
      { key: "FEATURE_2_URL", type: "string" as const, fallbackValue: "https://rxsystems.app" },
      { key: "FEATURE_2_LINK_TEXT", type: "string" as const, fallbackValue: "Learn more" },
      { key: "CTA_URL", type: "string" as const, fallbackValue: "https://rxsystems.app/dashboard" },
      { key: "CTA_TEXT", type: "string" as const, fallbackValue: "Open Dashboard" },
      { key: "FOOTER_TEXT", type: "string" as const, fallbackValue: "Thanks for being part of the Rx Systems community!" },
    ],
  },
  notice: {
    name: "rx-notice",
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
            <h2 style="color: #a1a1aa; font-size: 18px; font-weight: normal; margin-bottom: 24px;">{{{SUBJECT}}}</h2>
            <p style="color: #fafafa; margin-bottom: 16px;">Hi {{{USERNAME}}},</p>
            <div style="color: #d4d4d8; line-height: 1.6; white-space: pre-wrap;">{{{MESSAGE}}}</div>
            <hr style="border: none; border-top: 1px solid #262626; margin: 32px 0;">
            <p style="color: #71717a; font-size: 12px;">
              You received this email because you have Creator Notices enabled in your RxSystems dashboard settings.
            </p>
          </div>
        </body>
      </html>
    `,
    variables: [
      { key: "SUBJECT", type: "string" as const, fallbackValue: "Important Update" },
      { key: "USERNAME", type: "string" as const, fallbackValue: "User" },
      { key: "MESSAGE", type: "string" as const, fallbackValue: "This is a notice from the RxSystems team." },
    ],
  },
}

// GET - List all templates
export async function GET() {
  try {
    const templates = await resend.templates.list()
    return NextResponse.json({ success: true, templates: templates.data })
  } catch (error) {
    console.error("[templates] Error listing templates:", error)
    return NextResponse.json(
      { success: false, error: "Failed to list templates" },
      { status: 500 }
    )
  }
}

// POST - Create a template
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { templateKey, publish = true } = body as { templateKey: keyof typeof TEMPLATES; publish?: boolean }

    if (!templateKey || !TEMPLATES[templateKey]) {
      return NextResponse.json(
        { success: false, error: "Invalid template key. Use 'newsletter' or 'notice'" },
        { status: 400 }
      )
    }

    const template = TEMPLATES[templateKey]

    // Create the template
    const result = await resend.templates.create({
      name: template.name,
      html: template.html,
      variables: template.variables,
    })

    // Optionally publish it
    if (publish && result.data?.id) {
      await resend.templates.publish(result.data.id)
    }

    return NextResponse.json({
      success: true,
      templateId: result.data?.id,
      message: `Template '${template.name}' created${publish ? " and published" : ""} successfully`,
    })
  } catch (error: unknown) {
    console.error("[templates] Error creating template:", error)
    
    // Check if it's a "template already exists" error
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    if (errorMessage.includes("already exists")) {
      return NextResponse.json(
        { success: false, error: "Template already exists. Delete it first or use PUT to update." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: "Failed to create template" },
      { status: 500 }
    )
  }
}

// PUT - Update an existing template
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { templateId, templateKey, publish = true } = body as { 
      templateId: string
      templateKey?: keyof typeof TEMPLATES
      publish?: boolean 
    }

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "templateId is required" },
        { status: 400 }
      )
    }

    // If templateKey provided, use predefined template
    if (templateKey && TEMPLATES[templateKey]) {
      const template = TEMPLATES[templateKey]
      await resend.templates.update(templateId, {
        name: template.name,
        html: template.html,
      })
    }

    // Publish if requested
    if (publish) {
      await resend.templates.publish(templateId)
    }

    return NextResponse.json({
      success: true,
      templateId,
      message: `Template updated${publish ? " and published" : ""} successfully`,
    })
  } catch (error) {
    console.error("[templates] Error updating template:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update template" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a template
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get("templateId")

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "templateId query parameter is required" },
        { status: 400 }
      )
    }

    await resend.templates.remove(templateId)

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    })
  } catch (error) {
    console.error("[templates] Error deleting template:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete template" },
      { status: 500 }
    )
  }
}
