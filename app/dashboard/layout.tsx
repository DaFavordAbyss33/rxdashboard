"use client"

import React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"

// Routes that require admin access
const ADMIN_ROUTES = ["/dashboard", "/dashboard/admin"]

function isAdminRoute(pathname: string): boolean {
  // Exact match for /dashboard (Overview) or /dashboard/admin
  return pathname === "/dashboard" || pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin, isAdminLoading, hasBetaAccess, betaLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
      return
    }
    
    // Check admin access for protected routes
    if (!isLoading && !isAdminLoading && isAuthenticated && !isAdmin) {
      if (isAdminRoute(pathname)) {
        // Redirect non-admins trying to access admin routes
        router.push("/dashboard/bots")
      }
    }

    // Check beta access - redirect to beta wall if not authorized
    if (!isLoading && !betaLoading && isAuthenticated && !hasBetaAccess) {
      // Allow the beta wall page itself
      if (pathname !== "/dashboard/beta-wall") {
        router.push("/dashboard/beta-wall")
      }
    }
  }, [isAuthenticated, isLoading, isAdmin, isAdminLoading, hasBetaAccess, betaLoading, pathname, router])

  if (isLoading || betaLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Show beta wall without sidebar/header for unauthorized users
  if (!hasBetaAccess && pathname === "/dashboard/beta-wall") {
    return <>{children}</>
  }

  // If not authorized and not on beta wall, don't render (redirect will happen)
  if (!hasBetaAccess) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
