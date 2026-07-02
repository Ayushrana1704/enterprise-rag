import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { getCurrentUser, login as loginRequest } from "@/features/auth/auth-api"
import {
  clearStoredSession,
  getStoredSession,
  storeSession,
} from "@/features/auth/auth-storage"
import type { AuthSession, LoginCredentials } from "@/features/auth/types"

type AuthContextValue = {
  session: AuthSession | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const logout = useCallback(() => {
    clearStoredSession()
    setSession(null)
  }, [])

  useEffect(() => {
    const storedSession = getStoredSession()
    if (!storedSession) {
      setIsInitializing(false)
      return
    }

    if (isExpired(storedSession.expiresAt)) {
      logout()
      setIsInitializing(false)
      return
    }

    getCurrentUser(storedSession.accessToken)
      .then((user) => {
        const refreshedSession = { ...storedSession, user }
        storeSession(refreshedSession)
        setSession(refreshedSession)
      })
      .catch(logout)
      .finally(() => setIsInitializing(false))
  }, [logout])

  useEffect(() => {
    if (!session) {
      return
    }

    const millisecondsUntilExpiry = new Date(session.expiresAt).getTime() - Date.now()
    if (millisecondsUntilExpiry <= 0) {
      logout()
      return
    }

    const timeoutId = window.setTimeout(logout, millisecondsUntilExpiry)
    return () => window.clearTimeout(timeoutId)
  }, [logout, session])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextSession = await loginRequest(credentials)
    storeSession(nextSession)
    setSession(nextSession)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session !== null,
      isInitializing,
      login,
      logout,
    }),
    [isInitializing, login, logout, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now()
}
