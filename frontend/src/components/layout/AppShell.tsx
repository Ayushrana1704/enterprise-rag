import { Outlet } from "react-router-dom"
import { AppHeader } from "./AppHeader"

/**
 * Root layout for all authenticated pages.
 * Header is sticky; <main> fills remaining height.
 * Individual pages control their own scroll behavior.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
