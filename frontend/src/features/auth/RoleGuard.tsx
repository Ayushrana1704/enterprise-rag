import { Navigate } from "react-router-dom"

import { useAuth } from "@/features/auth/AuthProvider"
import type { UserRole } from "@/features/auth/types"

type RoleGuardProps = {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { session } = useAuth()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(session.user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}