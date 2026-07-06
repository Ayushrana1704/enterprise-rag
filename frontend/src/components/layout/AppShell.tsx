import { Outlet } from "react-router-dom"

import { AppHeader } from "./AppHeader"

/**
 * Root layout for all authenticated pages.
 *
 * Registered as a React Router layout route in App.tsx so every protected
 * child route automatically inherits the header and content structure.
 * Pages render into the <Outlet /> below the header.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
