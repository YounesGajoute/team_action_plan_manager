"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Navigation from "@/components/navigation"

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { user, isLoading, isHydrated } = useAuth()
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith("/auth")

  console.log("??? ClientLayout:", { 
    pathname, 
    user: user?.username || null, 
    isAuthPage, 
    isLoading,
    isHydrated
  })

  // For auth pages, render without layout
  if (isAuthPage) {
    return <>{children}</>
  }

  // Show loading while checking auth state
  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  // For non-auth pages, only render the layout structure
  // The actual authentication check is handled by ProtectedRoute
  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navigation />}
      <main>{children}</main>
    </div>
  )
}