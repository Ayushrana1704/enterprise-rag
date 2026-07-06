/**
 * Lightweight toast system -- no external dependency.
 *
 * Uses tailwindcss-animate for enter/exit transitions.
 * Auto-dismisses after 4.5s. Max 3 visible toasts.
 */

import { createContext, useCallback, useContext, useState } from "react"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = "success" | "error" | "info"

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }])
      setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (ctx === null) {
    throw new Error("useToast must be called inside <ToastProvider>")
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

const STYLES = {
  success:
    "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-500/20",
  error:
    "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20",
  info:
    "border-border bg-card text-card-foreground shadow-md",
} as const

const ICON_STYLES = {
  success: "text-emerald-500",
  error: "text-destructive",
  info: "text-primary",
} as const

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5"
    >
      {toasts.map((t) => {
        const Icon = ICON[t.variant]
        return (
          <div
            key={t.id}
            role="alert"
            className={cn(
              "flex w-80 items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg",
              "animate-in slide-in-from-right-8 fade-in duration-200",
              STYLES[t.variant],
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                t.variant === "success" && "bg-emerald-100 dark:bg-emerald-900/40",
                t.variant === "error" && "bg-destructive/10",
                t.variant === "info" && "bg-primary/10",
              )}
            >
              <Icon
                className={cn("h-3.5 w-3.5", ICON_STYLES[t.variant])}
                aria-hidden="true"
              />
            </div>
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className={cn(
                "shrink-0 rounded p-0.5 opacity-50 transition-opacity",
                "hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
