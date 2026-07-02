export type UserRole = "ADMIN" | "HR" | "FINANCE" | "EMPLOYEE"

export type AuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
}

export type AuthSession = {
  accessToken: string
  expiresAt: string
  user: AuthUser
}

export type LoginCredentials = {
  email: string
  password: string
}
