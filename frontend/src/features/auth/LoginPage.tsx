import { LockKeyhole } from "lucide-react"
import { FormEvent, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/AuthProvider"

type LocationState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const [email, setEmail] = useState("admin@company.com")
  const [password, setPassword] = useState("Password@123")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from?.pathname ?? "/"

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError("Email and password are required.")
      return
    }

    if (!email.includes("@")) {
      setError("Enter a valid company email address.")
      return
    }

    try {
      setIsSubmitting(true)
      await login({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch {
      setError("Invalid email or password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-enterprise sm:p-8">
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Enterprise AI Knowledge Assistant
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Sign in</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Use one of the seeded demo accounts to access the protected dashboard.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              type="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              type="password"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Login"}
          </Button>
        </form>
      </section>
    </main>
  )
}
