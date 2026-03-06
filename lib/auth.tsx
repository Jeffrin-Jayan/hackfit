"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { useRouter } from "next/navigation"

// Types
export interface User {
  id: string
  email: string
  display_name: string
  current_phase: "voice" | "code" | "peer"
  phases_completed: string[]
  voice_status: "not_started" | "in_progress" | "passed" | "failed"
  code_status: "not_started" | "in_progress" | "passed" | "failed"
  peer_status: "not_started" | "in_progress" | "passed" | "failed"
  voice_score: number | null
  code_score: number | null
  peer_score: number | null
  overall_score: number | null
  is_verified: boolean
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Get token from localStorage
  const getToken = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("skillbridge_token")
    }
    return null
  }, [])

  // Set token in localStorage
  const setToken = useCallback((token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("skillbridge_token", token)
    }
  }, [])

  // Remove token from localStorage
  const removeToken = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("skillbridge_token")
    }
  }, [])

  // Fetch current user
  const fetchUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return null
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        removeToken()
        return null
      }

      const userData = await response.json()
      return userData
    } catch (error) {
      console.error("Failed to fetch user:", error)
      removeToken()
      return null
    }
  }, [getToken, removeToken])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      const userData = await fetchUser()
      setUser(userData)
      setIsLoading(false)
    }
    initAuth()
  }, [fetchUser])

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Login failed")
      }

      const data = await response.json()
      setToken(data.access_token)
      setUser(data.user)
      router.push("/dashboard")
    },
    [router, setToken]
  )

  // Register
  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          password, 
          display_name: displayName 
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Registration failed")
      }

      const data = await response.json()
      setToken(data.access_token)
      setUser(data.user)
      router.push("/dashboard")
    },
    [router, setToken]
  )

  // Logout
  const logout = useCallback(() => {
    removeToken()
    setUser(null)
    router.push("/")
  }, [removeToken, router])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const userData = await fetchUser()
    setUser(userData)
  }, [fetchUser])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Hook to check if user can access a phase
export function usePhaseAccess(phase: "voice" | "code" | "peer") {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return { canAccess: false, isLoading: true }
  }

  if (!user) {
    return { canAccess: false, isLoading: false }
  }

  switch (phase) {
    case "voice":
      // Voice is always accessible
      return { canAccess: true, isLoading: false }
    case "code":
      // Code requires passing voice
      return { 
        canAccess: user.voice_status === "passed", 
        isLoading: false 
      }
    case "peer":
      // Peer requires passing code
      return { 
        canAccess: user.code_status === "passed", 
        isLoading: false 
      }
    default:
      return { canAccess: false, isLoading: false }
  }
}

// Protected route wrapper
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { redirectTo?: string }
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push(options?.redirectTo || "/auth/login")
      }
    }, [isAuthenticated, isLoading, router])

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return null
    }

    return <Component {...props} />
  }
}
