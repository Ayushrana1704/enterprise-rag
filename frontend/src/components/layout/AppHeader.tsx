import { BrainCircuit, LayoutDashboard, LogOut, MessageSquare } from "lucide-react"
import { NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/AuthProvider"
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

  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8 lg:px-10">

        {/* Branding */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BrainCircuit className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden text-sm font-semibold sm:block">Enterprise AI</span>
        </div>

        {/* Primary navigation */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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

        {/* User identity + logout */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight">{session?.user.name}</p>
            <p className="text-xs text-muted-foreground">{session?.user.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </header>
  )
}
