"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: number
  username: string
  role: string
  full_name: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (token: string, userData: User) => Promise<void>
  logout: () => void
  isLoading: boolean
  isHydrated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Safe cookie functions that check for browser environment
function setCookie(name: string, value: string, days: number = 7) {
  if (typeof window === 'undefined') return
  
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null
  
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

function deleteCookie(name: string) {
  if (typeof window === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
}

// Safe localStorage functions
function getLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function setLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage errors
  }
}

function removeLocalStorage(key: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Initialize auth state on hydration
  useEffect(() => {
    if (!isHydrated) return

    console.log("?? Checking existing auth...")
    
    const cookieToken = getCookie("authToken")
    const cookieUser = getCookie("userData")
    const localToken = getLocalStorage("authToken")
    const localUser = getLocalStorage("user")
    
    const token = cookieToken || localToken
    const userData = cookieUser || localUser

    console.log("?? Found auth data:", { 
      cookieToken: !!cookieToken, 
      localToken: !!localToken,
      hasUserData: !!(cookieUser || localUser)
    })

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        console.log("?? Stored user:", parsedUser.username)
        
        // Set user immediately for faster UI response
        setUser(parsedUser)
        
        // Migrate to cookies if needed
        if (!cookieToken && localToken) {
          console.log("?? Migrating to cookies...")
          setCookie("authToken", localToken)
          setCookie("userData", userData)
        }
        
        // Verify token in background
        fetch("/api/auth/verify", {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => {
          console.log("? Token verification:", response.status)
          if (!response.ok) {
            console.log("? Token invalid, clearing...")
            setUser(null)
            deleteCookie("authToken")
            deleteCookie("userData")
            removeLocalStorage("authToken")
            removeLocalStorage("user")
          }
        })
        .catch(error => {
          console.error("?? Verification error:", error)
          setUser(null)
          deleteCookie("authToken")
          deleteCookie("userData")
          removeLocalStorage("authToken")
          removeLocalStorage("user")
        })
        .finally(() => {
          setIsLoading(false)
        })
      } catch (error) {
        console.error("?? Parse error:", error)
        deleteCookie("authToken")
        deleteCookie("userData")
        removeLocalStorage("authToken")
        removeLocalStorage("user")
        setIsLoading(false)
      }
    } else {
      console.log("? No existing auth data")
      setIsLoading(false)
    }
  }, [isHydrated])

  const login = async (token: string, userData: User): Promise<void> => {
    console.log("?? Logging in:", userData.username)
    
    // Store authentication data
    setCookie("authToken", token, 7)
    setCookie("userData", JSON.stringify(userData), 7)
    setLocalStorage("authToken", token)
    setLocalStorage("user", JSON.stringify(userData))
    
    // Update state immediately
    setUser(userData)
    setIsLoading(false)
    
    console.log("? Login complete, navigating...")
    
    // Use Next.js router instead of hard redirect
    await router.push("/")
  }

  const logout = () => {
    console.log("?? Logging out")
    
    deleteCookie("authToken")
    deleteCookie("userData")
    removeLocalStorage("authToken")
    removeLocalStorage("user")
    
    setUser(null)
    router.push("/auth/login")
  }

  console.log("?? Auth state:", { 
    user: user?.username || null, 
    isLoading, 
    isHydrated 
  })

  // Don't render anything until hydration is complete
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isHydrated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}