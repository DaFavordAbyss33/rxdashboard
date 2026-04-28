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
  const { isAuthenticated, isLoading, isAdmin, isAdminLoading } = useAuth()
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
  }, [isAuthenticated, isLoading, isAdmin, isAdminLoading, pathname, router])

  if (isLoading) {
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
