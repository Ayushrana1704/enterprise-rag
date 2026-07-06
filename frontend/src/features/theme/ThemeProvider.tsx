/**
 * ThemeProvider — light / dark / system theme management.
 *
 * - Persists the user's choice in localStorage under the key "theme".
 * - Resolves "system" by reading prefers-color-scheme and listening for
 *   OS-level changes in real time.
 * - Applies / removes the "dark" class on <html> so Tailwind's darkMode:
 *   ["class"] strategy picks it up.
 *
 * Usage:
 *   1. Wrap the app root with <ThemeProvider>.
 *   2. Call useTheme() anywhere inside to get { theme, resolvedTheme, setTheme }.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = "light" | "dark" | "system"

interface ThemeContextValue {
  /** The stored preference — "light", "dark", or "system". */
  theme: ThemeMode
  /** The effective theme after resolving "system" via prefers-color-scheme. */
  resolvedTheme: "light" | "dark"
  setTheme: (mode: ThemeMode) => void
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "theme"

function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === "light" || v === "dark" || v === "system") return v
  } catch {
    // localStorage unavailable (private browsing, SSR)
  }
  return "system"
}

function getSystemPreference(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemPreference() : mode
}

function applyClass(resolved: "light" | "dark"): void {
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readStoredTheme)

  const resolvedTheme = useMemo(() => resolveMode(theme), [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // ignore write failures
    }
  }, [])

  // Apply class whenever the resolved theme changes
  useEffect(() => {
    applyClass(resolveMode(theme))
  }, [theme])

  // When in "system" mode, keep in sync with OS preference changes
  useEffect(() => {
    if (theme !== "system") return

    const mq = window.matchMedia("(prefers-color-scheme: dark)")

    function handleChange(e: MediaQueryListEvent) {
      applyClass(e.matches ? "dark" : "light")
    }

    mq.addEventListener("change", handleChange)
    return () => mq.removeEventListener("change", handleChange)
  }, [theme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error("useTheme must be called inside <ThemeProvider>")
  }
  return ctx
}
