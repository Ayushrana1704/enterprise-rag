import type { AuthSession } from "@/features/auth/types"

const SESSION_KEY = "enterprise-ai-auth-session"

export function getStoredSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(SESSION_KEY)
  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as AuthSession
  } catch {
    clearStoredSession()
    return null
  }
}

export function storeSession(session: AuthSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(SESSION_KEY)
}
