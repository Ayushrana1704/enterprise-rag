import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

export type StatusTone = "green" | "yellow" | "red" | "blue"

type StatusCardProps = {
  title: string
  description: string
  status: string
  tone: StatusTone
  icon: ComponentType<{ className?: string }>
}

export const toneClasses: Record<StatusTone, string> = {
  green: "bg-emerald-500 shadow-emerald-500/30",
  yellow: "bg-amber-400 shadow-amber-400/30",
  red: "bg-rose-500 shadow-rose-500/30",
  blue: "bg-blue-500 shadow-blue-500/30",
}

export function StatusCard({ title, description, status, tone, icon: Icon }: StatusCardProps) {
  return (
    <article className="rounded-xl border bg-card p-5 text-card-foreground shadow-enterprise transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className={cn("h-3 w-3 rounded-full shadow-lg", toneClasses[tone])} />
      </div>
      <div className="mt-6 rounded-lg bg-muted px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
        <p className="mt-1 text-sm font-semibold">{status}</p>
      </div>
    </article>
  )
}
