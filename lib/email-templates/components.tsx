import * as React from "react"

// ============ CONFIGURATION ============
export const EMAIL_CONFIG = {
  baseUrl: "https://rxsystems.app",
  colors: {
    background: "#0b0b0f",
    cardBg: "#12121a",
    border: "rgba(255,255,255,0.08)",
    gradient: "linear-gradient(90deg, #7C4DFF 0%, #FF8A3D 100%)",
    white: "#ffffff",
    muted: "rgba(255,255,255,0.88)",
    mutedLight: "rgba(255,255,255,0.65)",
  },
  images: {
    bulletPoint: "https://rxsystems.app/email/bullet-point.png",
    discordIcon: "https://rxsystems.app/email/discord-icon.png",
    arrow: "https://rxsystems.app/email/arrow.png",
  },
  links: {
    dashboard: "https://rxsystems.app/dashboard",
    discord: "https://discord.gg/rxsystems",
    unsubscribe: "https://rxsystems.app/unsubscribe",
  },
}

// ============ REUSABLE COMPONENTS ============

export interface BulletItemProps {
  children: React.ReactNode
}

export interface SectionCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export interface FeatureRowProps {
  title: string
  description: string
  linkUrl?: string
  linkText?: string
}

export interface CTAButtonProps {
  href: string
  children: React.ReactNode
}

// ============ NEWSLETTER DATA STRUCTURE ============
export interface NewsletterContent {
  // Header
  previewText?: string
  heroTitle?: string
  heroSubtitle?: string
  
  // Highlights section
  highlightsIntro?: string
  highlights?: string[]
  
  // Feature sections
  features?: Array<{
    title: string
    description: string
    linkUrl?: string
    linkText?: string
  }>
  
  // Custom sections
  sections?: Array<{
    title: string
    subtitle?: string
    content: string | string[]
  }>
  
  // CTA
  ctaText?: string
  ctaUrl?: string
  
  // Footer
  footerNote?: string
}

// Default content - customize per issue
export const DEFAULT_NEWSLETTER_CONTENT: NewsletterContent = {
  previewText: "Discover new Rx Systems features and bot improvements this month",
  heroTitle: "NEWSLETTER",
  heroSubtitle: "Quick updates on bots, new features, and what's shipping next.",
  highlightsIntro: "A quick look at what happened this month and upcoming changes you should know about.",
  highlights: [
    "New dashboard UI with improved navigation",
    "Bot status monitoring improvements",
    "Performance optimizations across all bots",
  ],
  features: [
    {
      title: "Improved Bot Monitoring",
      description: "Real-time status updates and incident tracking for all your bots.",
      linkUrl: "https://rxsystems.app/dashboard",
      linkText: "View Dashboard",
    },
  ],
  ctaText: "Open Dashboard",
  ctaUrl: "https://rxsystems.app/dashboard",
  footerNote: "You're receiving this because you subscribed to Rx Systems updates.",
}

// Helper to generate HTML bullet list
export function generateBulletList(items: string[]): string {
  return items.map(item => `
    <tr style="margin:0;padding:0">
      <td style="margin:0;padding:6px 0;vertical-align:top;width:24px">
        <img src="${EMAIL_CONFIG.images.bulletPoint}" width="10" height="10" alt="" style="display:block;margin-top:6px" />
      </td>
      <td style="margin:0;padding:6px 0 6px 8px;color:rgba(255,255,255,0.88);font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px">
        ${item}
      </td>
    </tr>
  `).join("")
}

// Helper to generate feature card
export function generateFeatureCard(feature: FeatureRowProps): string {
  const link = feature.linkUrl ? `
    <a href="${feature.linkUrl}" style="display:inline-block;margin-top:12px;padding:10px 18px;background:linear-gradient(90deg, #7C4DFF 0%, #FF8A3D 100%);border-radius:8px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none">
      ${feature.linkText || "Learn More"}
    </a>
  ` : ""
  
  return `
    <tr style="margin:0;padding:0">
      <td style="margin:0;padding:18px 22px;background:#12121a;border-radius:14px;border:1px solid rgba(255,255,255,0.08)">
        <div style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700">${feature.title}</div>
        <div style="margin-top:8px;color:rgba(255,255,255,0.75);font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px">${feature.description}</div>
        ${link}
      </td>
    </tr>
    <tr><td style="height:12px"></td></tr>
  `
}
