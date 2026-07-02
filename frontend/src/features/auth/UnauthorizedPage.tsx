import { ShieldAlert } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-enterprise">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-semibold">Unauthorized</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          You are not authorized to view this area. Authentication is ready now; RBAC rules will be
          added in a later milestone.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Return to dashboard</Link>
        </Button>
      </section>
    </main>
  )
}
