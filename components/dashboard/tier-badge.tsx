"use client"

import { cn } from "@/lib/utils"

export type UserTier = "bronze" | "silver" | "gold" | "platinum" | "diamond"

export interface TierInfo {
  name: string
  label: string
  minMonths: number
  maxMonths: number | null
  description: string
  color: string
  bgColor: string
  borderColor: string
  glowColor: string
  iconGradient: string
}

export const TIERS: Record<UserTier, TierInfo> = {
  bronze: {
    name: "Bronze",
    label: "0-1 Month",
    minMonths: 0,
    maxMonths: 1,
    description: "New member of Rx Systems",
    color: "text-[#CD7F32]",
    bgColor: "bg-[#CD7F32]/10",
    borderColor: "border-[#CD7F32]/30",
    glowColor: "shadow-[#CD7F32]/10",
    iconGradient: "from-[#CD7F32] to-[#A0522D]",
  },
  silver: {
    name: "Silver",
    label: "1-6 Months",
    minMonths: 1,
    maxMonths: 6,
    description: "Established Rx Systems user",
    color: "text-[#C0C0C0]",
    bgColor: "bg-[#C0C0C0]/10",
    borderColor: "border-[#C0C0C0]/30",
    glowColor: "shadow-[#C0C0C0]/10",
    iconGradient: "from-[#C0C0C0] to-[#A8A8A8]",
  },
  gold: {
    name: "Gold",
    label: "6-12 Months",
    minMonths: 6,
    maxMonths: 12,
    description: "Veteran Rx Systems user",
    color: "text-[#FFD700]",
    bgColor: "bg-[#FFD700]/10",
    borderColor: "border-[#FFD700]/30",
    glowColor: "shadow-[#FFD700]/10",
    iconGradient: "from-[#FFD700] to-[#DAA520]",
  },
  platinum: {
    name: "Platinum",
    label: "12-24 Months",
    minMonths: 12,
    maxMonths: 24,
    description: "Dedicated Rx Systems supporter",
    color: "text-[#E5E4E2]",
    bgColor: "bg-[#E5E4E2]/10",
    borderColor: "border-[#E5E4E2]/30",
    glowColor: "shadow-[#E5E4E2]/10",
    iconGradient: "from-[#E5E4E2] to-[#B0B0B0]",
  },
  diamond: {
    name: "Diamond",
    label: "24+ Months",
    minMonths: 24,
    maxMonths: null,
    description: "Elite Rx Systems member",
    color: "text-[#B9F2FF]",
    bgColor: "bg-[#B9F2FF]/10",
    borderColor: "border-[#B9F2FF]/30",
    glowColor: "shadow-[#B9F2FF]/10",
    iconGradient: "from-[#B9F2FF] to-[#7DF9FF]",
  },
}

const TIER_ORDER: UserTier[] = ["bronze", "silver", "gold", "platinum", "diamond"]

export function getTierFromMonths(months: number): UserTier {
  if (months >= 24) return "diamond"
  if (months >= 12) return "platinum"
  if (months >= 6) return "gold"
  if (months >= 1) return "silver"
  return "bronze"
}

export function getTierFromDate(joinDate: string | Date): UserTier {
  const join = new Date(joinDate)
  const now = new Date()
  const diffMs = now.getTime() - join.getTime()
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.44)
  return getTierFromMonths(months)
}

function TierIcon({ tier, size = "sm" }: { tier: UserTier; size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: { outer: "h-5 w-5", inner: "h-3 w-3", text: "text-[8px]" },
    md: { outer: "h-7 w-7", inner: "h-4 w-4", text: "text-[10px]" },
    lg: { outer: "h-10 w-10", inner: "h-6 w-6", text: "text-xs" },
  }

  const s = sizeMap[size]
  const tierInfo = TIERS[tier]

  // Diamond shape for diamond tier
  if (tier === "diamond") {
    return (
      <div className={cn("relative flex items-center justify-center", s.outer)}>
        <div
          className={cn(
            "absolute inset-0 rotate-45 rounded-sm bg-gradient-to-br",
            tierInfo.iconGradient
          )}
        />
        <span className={cn("relative z-10 font-bold text-background", s.text)}>D</span>
      </div>
    )
  }

  // Shield/hexagonal shape for platinum
  if (tier === "platinum") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-gradient-to-br",
          tierInfo.iconGradient,
          s.outer
        )}
      >
        <span className={cn("font-bold text-background", s.text)}>P</span>
      </div>
    )
  }

  // Star shape for gold
  if (tier === "gold") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br",
          tierInfo.iconGradient,
          s.outer
        )}
      >
        <span className={cn("font-bold text-background", s.text)}>G</span>
      </div>
    )
  }

  // Circle for silver
  if (tier === "silver") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br ring-1 ring-inset ring-white/20",
          tierInfo.iconGradient,
          s.outer
        )}
      >
        <span className={cn("font-bold text-background", s.text)}>S</span>
      </div>
    )
  }

  // Basic circle for bronze
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br",
        tierInfo.iconGradient,
        s.outer
      )}
    >
      <span className={cn("font-bold text-background", s.text)}>B</span>
    </div>
  )
}

/** Compact badge for showing next to username */
export function TierBadge({
  tier,
  showLabel = false,
  size = "sm",
  className,
}: {
  tier: UserTier
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const tierInfo = TIERS[tier]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        tierInfo.bgColor,
        tierInfo.borderColor,
        className
      )}
      title={`${tierInfo.name} Tier - ${tierInfo.label}`}
    >
      <TierIcon tier={tier} size={size} />
      {showLabel && (
        <span className={cn("text-xs font-semibold", tierInfo.color)}>
          {tierInfo.name}
        </span>
      )}
    </div>
  )
}

/** Full tier card for profile/sidebar display */
export function TierCard({
  tier,
  joinDate,
  className,
}: {
  tier: UserTier
  joinDate?: string
  className?: string
}) {
  const tierInfo = TIERS[tier]
  const tierIndex = TIER_ORDER.indexOf(tier)
  const nextTier = tierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[tierIndex + 1] : null
  const nextTierInfo = nextTier ? TIERS[nextTier] : null

  // Calculate progress to next tier
  let progress = 100
  let monthsUsed = 0
  if (joinDate) {
    const join = new Date(joinDate)
    const now = new Date()
    const diffMs = now.getTime() - join.getTime()
    monthsUsed = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
  }

  if (nextTierInfo && tierInfo.maxMonths !== null) {
    const rangeStart = tierInfo.minMonths
    const rangeEnd = tierInfo.maxMonths
    const currentInRange = Math.min(monthsUsed - rangeStart, rangeEnd - rangeStart)
    progress = Math.round((currentInRange / (rangeEnd - rangeStart)) * 100)
    progress = Math.max(0, Math.min(100, progress))
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tierInfo.borderColor,
        tierInfo.bgColor,
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <TierIcon tier={tier} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-sm font-bold", tierInfo.color)}>
              {tierInfo.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {tierInfo.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {tierInfo.description}
          </p>
        </div>
      </div>

      {/* Progress to next tier */}
      {nextTierInfo && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progress to {nextTierInfo.name}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-all",
                tierInfo.iconGradient
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {tier === "diamond" && (
        <div className="mt-2 text-center">
          <span className={cn("text-[10px] font-semibold", tierInfo.color)}>
            Max Tier Reached
          </span>
        </div>
      )}
    </div>
  )
}

/** All tiers display for reference */
export function TierLegend({ currentTier }: { currentTier: UserTier }) {
  return (
    <div className="space-y-2">
      {TIER_ORDER.map((tierKey) => {
        const tierInfo = TIERS[tierKey]
        const isCurrent = tierKey === currentTier
        const isPast = TIER_ORDER.indexOf(tierKey) < TIER_ORDER.indexOf(currentTier)

        return (
          <div
            key={tierKey}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
              isCurrent
                ? cn(tierInfo.borderColor, tierInfo.bgColor)
                : isPast
                  ? "border-border/50 bg-secondary/20 opacity-60"
                  : "border-border/30 bg-secondary/10 opacity-40"
            )}
          >
            <TierIcon tier={tierKey} size="sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isCurrent ? tierInfo.color : "text-muted-foreground"
                  )}
                >
                  {tierInfo.name}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                    CURRENT
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{tierInfo.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
