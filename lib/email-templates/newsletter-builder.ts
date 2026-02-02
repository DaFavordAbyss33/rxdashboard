import { 
  EMAIL_CONFIG, 
  NewsletterContent, 
  DEFAULT_NEWSLETTER_CONTENT,
  generateBulletList,
  generateFeatureCard,
  generateImageBlock
} from "./components"
import { getNewsletterIssue } from "@/lib/newsletterMeta"

/**
 * Build a newsletter email from content configuration
 * This allows you to easily customize each newsletter issue
 */
export function buildNewsletter(content: Partial<NewsletterContent> = {}): string {
  const data = { ...DEFAULT_NEWSLETTER_CONTENT, ...content }
  const { ISSUE, YEAR, MONTH } = getNewsletterIssue()

  const highlightsList = data.highlights ? generateBulletList(data.highlights) : ""
  const featuresHtml = data.features?.map(f => generateFeatureCard(f)).join("") || ""
  const heroImageHtml = data.heroImage?.url ? generateImageBlock(data.heroImage) : ""
  const standaloneImagesHtml = data.images?.map(img => generateImageBlock(img)).join("") || ""

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <meta content="width=device-width" name="viewport" />
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="x-apple-disable-message-reformatting" />
  <style>
    html, body { margin:0 !important; padding:0 !important; height:100% !important; width:100% !important; }
    * { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt !important; mso-table-rspace:0pt !important; }
    table { border-collapse:collapse !important; border-spacing:0 !important; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
    a { text-decoration:none; }
    @media screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 16px !important; padding-right: 16px !important; }
      .hero-title { font-size: 36px !important; line-height: 42px !important; }
      .h1 { font-size: 22px !important; line-height: 28px !important; }
      .body { font-size: 15px !important; line-height: 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${EMAIL_CONFIG.colors.background}">
  <!-- Preview text -->
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
    ${data.previewText}
  </div>
  
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${EMAIL_CONFIG.colors.background}">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" class="container" style="max-width:600px">
          <tr>
            <td>
              <!-- HEADER with gradient -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${EMAIL_CONFIG.colors.gradient};border-radius:18px;overflow:hidden">
                <tr>
                  <td style="padding:18px">
                    <!-- Top bar: Logo + Issue info -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="vertical-align:top">
                          <div style="display:inline-block;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,0.18);color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.4px">
                            RX SYSTEMS
                          </div>
                        </td>
                        <td align="right" style="vertical-align:top">
                          <div style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.6px">NEWSLETTER</div>
                          <div style="color:rgba(255,255,255,0.85);font-family:Arial,Helvetica,sans-serif;font-size:12px;margin-top:4px">${MONTH} ${YEAR} • Issue ${ISSUE}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:14px 18px 22px 18px">
                    <div class="hero-title" style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:54px;line-height:58px;font-weight:900;letter-spacing:0.8px">
                      ${data.heroTitle}
                    </div>
                    <div class="body" style="margin-top:10px;color:rgba(255,255,255,0.88);font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;max-width:520px">
                      ${data.heroSubtitle}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Hero Image (if provided) -->
              ${heroImageHtml ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${heroImageHtml}
              </table>
              ` : ""}

              <!-- Spacer -->
              <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:14px"></td></tr></table>

              <!-- HIGHLIGHTS SECTION -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${EMAIL_CONFIG.colors.cardBg};border-radius:18px;border:1px solid ${EMAIL_CONFIG.colors.border}">
                <tr>
                  <td class="px" style="padding:22px">
                    <div class="h1" style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:30px;font-weight:900">
                      This week's highlights
                    </div>
                    <div class="body" style="margin-top:8px;margin-bottom:16px;color:rgba(255,255,255,0.65);font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px">
                      ${data.highlightsIntro}
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      ${highlightsList}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Spacer -->
              <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:14px"></td></tr></table>

              <!-- FEATURES SECTION -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${featuresHtml}
              </table>

              <!-- CTA BUTTON -->
              ${data.ctaText ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding:20px 0">
                    <a href="${data.ctaUrl || EMAIL_CONFIG.links.dashboard}" style="display:inline-block;padding:14px 32px;background:${EMAIL_CONFIG.colors.gradient};border-radius:10px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;text-decoration:none">
                      ${data.ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- FOOTER -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding:30px 20px">
                    <div style="color:rgba(255,255,255,0.5);font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px">
                      ${data.footerNote}<br/>
                      <a href="${EMAIL_CONFIG.links.unsubscribe}" style="color:rgba(255,255,255,0.5);text-decoration:underline">Unsubscribe</a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
