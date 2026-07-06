import { Eye, EyeOff, LockKeyhole, MailCheck } from "lucide-react"
import { FormEvent, useState } from "react"
import { Link, Navigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/AuthProvider"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type FormData = {
  name: string
  email: string
  password: string
  confirm: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

function validate(data: FormData): FormErrors {
  const errs: FormErrors = {}

  if (!data.name.trim()) {
    errs.name = "Full name is required."
  } else if (data.name.trim().length < 2) {
    errs.name = "Name must be at least 2 characters."
  }

  if (!data.email.trim()) {
    errs.email = "Email is required."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errs.email = "Enter a valid email address."
  }

  if (!data.password) {
    errs.password = "Password is required."
  } else if (data.password.length < 8) {
    errs.password = "Password must be at least 8 characters."
  } else if (!/[A-Z]/.test(data.password)) {
    errs.password = "Must include at least one uppercase letter."
  } else if (!/[0-9]/.test(data.password)) {
    errs.password = "Must include at least one number."
  }

  if (!data.confirm) {
    errs.confirm = "Please confirm your password."
  } else if (data.password !== data.confirm) {
    errs.confirm = "Passwords do not match."
  }

  return errs
}

// ---------------------------------------------------------------------------
// Input helper
// ---------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-destructive">{message}</p>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RegisterPage() {
  const { isAuthenticated } = useAuth()

  const [form, setForm] = useState<FormData>({ name: "", email: "", password: "", confirm: "" })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  function handleChange(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setIsSubmitting(true)
    // Simulate submission — no backend register endpoint in this deployment.
    await new Promise((r) => setTimeout(r, 700))
    setIsSubmitting(false)
    setSubmitted(true)
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
        <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-enterprise">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold">Request received</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Account creation requires administrator approval. Your request for{" "}
            <strong className="font-semibold text-foreground">{form.email}</strong> has been
            noted. Contact your IT administrator to get access.
          </p>
          <Button asChild className="mt-8 w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </section>
      </main>
    )
  }

  // ── Registration form ─────────────────────────────────────────────────────
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
          <h1 className="mt-1.5 text-3xl font-semibold">Create account</h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            Request access to the platform. Your administrator will approve your account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>

          {/* Full Name */}
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Jane Smith"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "reg-name-err" : undefined}
              className={cn(
                "mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition",
                "placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                errors.name ? "border-destructive" : "border-input",
              )}
            />
            <FieldError message={errors.name} />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium">
              Work Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="jane@company.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "reg-email-err" : undefined}
              className={cn(
                "mt-2 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition",
                "placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                errors.email ? "border-destructive" : "border-input",
              )}
            />
            <FieldError message={errors.email} />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-pw" className="block text-sm font-medium">
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="reg-pw"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange("password")}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                aria-invalid={!!errors.password}
                className={cn(
                  "h-11 w-full rounded-lg border bg-background px-3 pr-10 text-sm outline-none transition",
                  "placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                  errors.password ? "border-destructive" : "border-input",
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <FieldError message={errors.password} />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="reg-confirm" className="block text-sm font-medium">
              Confirm Password
            </label>
            <div className="relative mt-2">
              <input
                id="reg-confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirm}
                onChange={handleChange("confirm")}
                placeholder="Repeat your password"
                aria-invalid={!!errors.confirm}
                className={cn(
                  "h-11 w-full rounded-lg border bg-background px-3 pr-10 text-sm outline-none transition",
                  "placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
                  errors.confirm ? "border-destructive" : "border-input",
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <FieldError message={errors.confirm} />
          </div>

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Submitting…" : "Request access"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
            >
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}
