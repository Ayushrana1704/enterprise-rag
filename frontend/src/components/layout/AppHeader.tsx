import { BrainCircuit, LayoutDashboard, LogOut, MessageSquare, Moon, Sun } from "lucide-react"
import { NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/AuthProvider"
import { useTheme } from "@/features/theme/ThemeProvider"
import { cn } from "@/lib/utils"

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/chat", label: "Chat", icon: MessageSquare },
]

export function AppHeader() {
  const { session, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      {/* h-[var(--header-h)] keeps this in sync with ChatLayout/ChatPage calc() */}
      <div className="mx-auto flex h-[var(--header-h)] max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-8 lg:px-10">

        {/* Branding */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <BrainCircuit className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">Enterprise AI</span>
        </div>

        {/* Primary navigation */}
        <nav className="flex items-center gap-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-1.5">

          {/* User identity */}
          <div className="hidden text-right sm:block mr-1">
            <p className="text-sm font-semibold leading-tight">{session?.user.name}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{session?.user.role?.toLowerCase()}</p>
          </div>

          {/* Avatar circle with initials */}
          {session?.user.name && (
            <div
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary ring-2 ring-primary/20 select-none"
              title={session.user.name}
            >
              {session.user.name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase() ?? "")
                .join("")}
            </div>
          )}

          {/* Theme toggle: Sun/Moon animated swap */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <span
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center",
                "transition-all duration-300",
                resolvedTheme === "dark"
                  ? "rotate-90 scale-0 opacity-0"
                  : "rotate-0 scale-100 opacity-100",
              )}
              aria-hidden="true"
            >
              <Sun className="h-4 w-4" />
            </span>
            <span
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center",
                "transition-all duration-300",
                resolvedTheme === "dark"
                  ? "rotate-0 scale-100 opacity-100"
                  : "-rotate-90 scale-0 opacity-0",
              )}
              aria-hidden="true"
            >
              <Moon className="h-4 w-4" />
            </span>
          </Button>

          {/* Logout button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>

        </div>
      </div>
    </header>
  )
}
