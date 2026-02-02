"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Skeleton component v3 - force rebuild
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}
