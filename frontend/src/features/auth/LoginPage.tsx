import { Eye, EyeOff, LockKeyhole } from "lucide-react"
import { FormEvent, useState } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/AuthProvider"
import { cn } from "@/lib/utils"

type LocationState = {
  from?: { pathname?: string }
}

export function LoginPage() {
  const [email, setEmail] = useState("admin@company.com")
  const [password, setPassword] = useState("Password@123")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from?.pathname ?? "/"

  if (isAuthenticated) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError("Email and password are required.")
      return
    }
    if (!email.includes("@")) {
      setError("Enter a valid email address.")
      return
    }

    try {
      setIsSubmitting(true)
      await login({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch {
      setError("Invalid email or password. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-enterprise sm:p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Enterprise AI Knowledge Assistant
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold">Sign in</h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            Welcome back. Use your company credentials to access the platform.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-pw" className="block text-sm font-medium">
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="login-pw"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Demo credentials are pre-filled above.
          </p>

          {/* Divider */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className={cn(
                "font-medium text-primary underline-offset-4 hover:underline",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded",
              )}
            >
              Create account
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}
