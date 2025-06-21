"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isHydrated } = useAuth()
  const router = useRouter()

  console.log("??? ProtectedRoute:", { 
    user: user?.username || null, 
    isLoading,
    isHydrated,
    hasRequiredRole: requiredRole ? requiredRole.includes(user?.role || '') : true
  })

  useEffect(() => {
    // Only check auth after hydration is complete and loading is done
    if (!isHydrated || isLoading) {
      return
    }

    if (!user) {
      console.log("?? No user, redirecting to login")
      router.replace("/auth/login")
      return
    }

    // Check role requirements
    if (requiredRole && !requiredRole.includes(user.role)) {
      console.log("?? Insufficient permissions, redirecting to dashboard")
      router.replace("/")
      return
    }

    console.log("? Access granted")
  }, [user, isLoading, isHydrated, router, requiredRole])

  // Show loading while checking auth
  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Don't render children if no user (during redirect)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Check role requirements
  if (requiredRole && !requiredRole.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">?</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}