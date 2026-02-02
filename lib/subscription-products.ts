export interface SubscriptionProduct {
  id: string
  botId: string
  name: string
  description: string
  priceInCents: number
  interval: "month" | "year"
  features: string[]
  popular?: boolean
}

// Bot-specific webhook configuration
export const BOT_WEBHOOK_CONFIG: Record<string, { endpoint: string; secretEnvVar: string }> = {
  "syruprx-pro": {
    endpoint: "/api/webhooks/stripe/syruprx-pro",
    secretEnvVar: "STRIPE_WEBHOOK_SECRET_SYRUPRX_PRO",
  },
  mednoterx: {
    endpoint: "/api/webhooks/stripe/mednoterx",
    secretEnvVar: "STRIPE_WEBHOOK_SECRET_MEDNOTERX",
  },
  autoclockrx: {
    endpoint: "/api/webhooks/stripe/autoclockrx",
    secretEnvVar: "STRIPE_WEBHOOK_SECRET_AUTOCLOCKRX",
  },
}

// Subscription products for premium bots
// These are per-guild subscriptions
export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "syruprx-pro-monthly",
    botId: "syruprx-pro",
    name: "SyrupRx PRO Monthly",
    description: "Premium features and advanced analytics for Maple Hospital servers",
    priceInCents: 999, // $9.99/month
    interval: "month",
    features: [
      "Advanced staff analytics",
      "Custom role management",
      "Priority support",
      "Unlimited command usage",
      "Custom branding",
    ],
  },
  {
    id: "syruprx-pro-yearly",
    botId: "syruprx-pro",
    name: "SyrupRx PRO Yearly",
    description: "Premium features and advanced analytics - save 20% with yearly billing",
    priceInCents: 9588, // $95.88/year ($7.99/month)
    interval: "year",
    popular: true,
    features: [
      "Advanced staff analytics",
      "Custom role management",
      "Priority support",
      "Unlimited command usage",
      "Custom branding",
      "2 months free",
    ],
  },
  {
    id: "mednoterx-premium-monthly",
    botId: "mednoterx",
    name: "MedNoteRx Premium Monthly",
    description: "Advanced patient charting and medical documentation features",
    priceInCents: 1499, // $14.99/month
    interval: "month",
    features: [
      "Unlimited patient records",
      "Advanced charting templates",
      "Export to PDF/CSV",
      "Multi-department support",
      "Audit logging",
    ],
  },
  {
    id: "mednoterx-premium-yearly",
    botId: "mednoterx",
    name: "MedNoteRx Premium Yearly",
    description: "Advanced patient charting - save 20% with yearly billing",
    priceInCents: 14388, // $143.88/year ($11.99/month)
    interval: "year",
    popular: true,
    features: [
      "Unlimited patient records",
      "Advanced charting templates",
      "Export to PDF/CSV",
      "Multi-department support",
      "Audit logging",
      "2 months free",
    ],
  },
  {
    id: "autoclockrx-monthly",
    botId: "autoclockrx",
    name: "AutoclockRx Premium Monthly",
    description: "Automatic shift logging with MarizmaAPI integration",
    priceInCents: 1299, // $12.99/month
    interval: "month",
    features: [
      "Automatic shift logging",
      "MarizmaAPI integration",
      "Payroll export",
      "Activity monitoring",
      "Custom shift schedules",
    ],
  },
  {
    id: "autoclockrx-yearly",
    botId: "autoclockrx",
    name: "AutoclockRx Premium Yearly",
    description: "Automatic shift logging - save 20% with yearly billing",
    priceInCents: 12468, // $124.68/year ($10.39/month)
    interval: "year",
    popular: true,
    features: [
      "Automatic shift logging",
      "MarizmaAPI integration",
      "Payroll export",
      "Activity monitoring",
      "Custom shift schedules",
      "2 months free",
    ],
  },
]

export function getProductsByBotId(botId: string): SubscriptionProduct[] {
  return SUBSCRIPTION_PRODUCTS.filter((product) => product.botId === botId)
}

export function getProductById(productId: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((product) => product.id === productId)
}

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100)
}
