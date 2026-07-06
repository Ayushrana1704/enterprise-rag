import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuth } from "@/features/auth/AuthProvider"

function SessionLoader() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background"
      aria-busy="true"
      aria-label="Restoring session"
    >
      {/* Animated logo pulse */}
      <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary/20">
        <div className="h-5 w-5 rounded-full bg-primary/40" aria-hidden="true" />
      </div>
      {/* Text skeleton lines */}
      <div className="flex flex-col items-center gap-2" aria-hidden="true">
        <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-2.5 w-24 animate-pulse rounded-full bg-muted/60" />
      </div>
    </main>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <SessionLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
