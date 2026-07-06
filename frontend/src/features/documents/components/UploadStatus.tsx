import { memo } from "react"
import { AlertCircle, CheckCircle2, Clock, FileText, Hash, Layers, Loader2, Type } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadPhase } from "../hooks/useUpload"
import type { UploadResult } from "../types"

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
        <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      </div>
      <span className="min-w-0 flex-1 text-xs text-muted-foreground">{label}</span>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

function SuccessCard({ result, indexedAt }: { result: UploadResult; indexedAt: Date }) {
  const timeStr = indexedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div
      role="status"
      aria-label="Upload complete"
      className={cn(
        "overflow-hidden rounded-xl border border-emerald-200/60 bg-emerald-50/80",
        "dark:border-emerald-800/40 dark:bg-emerald-950/30",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-emerald-200/60 bg-emerald-100/60 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-900/20">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span className="flex-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Successfully indexed
        </span>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
          Ready
        </span>
      </div>

      {/* Filename */}
      <div className="flex items-center gap-2 border-b border-emerald-200/40 px-4 py-2.5 dark:border-emerald-800/30">
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground" title={result.filename}>
          {result.filename}
        </span>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <StatRow icon={Layers} label="Pages" value={result.pages} />
        <StatRow icon={Type} label="Characters" value={result.characters} />
        <StatRow icon={Hash} label="Chunks indexed" value={result.chunks} />
        <StatRow icon={Clock} label="Indexed at" value={timeStr} />
      </div>

      {/* CTA */}
      <div className="border-t border-emerald-200/40 bg-emerald-50/50 px-4 py-2.5 dark:border-emerald-800/30 dark:bg-emerald-950/20">
        <p className="text-center text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          Document is ready for questioning
        </p>
      </div>
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3",
        "animate-in fade-in duration-200",
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface UploadStatusProps {
  phase: UploadPhase
}

export const UploadStatus = memo(function UploadStatus({ phase }: UploadStatusProps) {
  switch (phase.status) {
    case "idle":
      return null

    case "ready":
      return (
        <div className={cn(
          "flex items-center gap-2.5 rounded-xl border bg-muted/40 px-3 py-2.5",
          "animate-in fade-in duration-200",
        )}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={phase.file.name}>
            {phase.file.name}
          </span>
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
            PDF
          </span>
        </div>
      )

    case "uploading":
      return (
        <div
          role="status"
          aria-label="Uploading and indexing"
          className="flex flex-col items-center gap-3 py-4"
        >
          <div className="relative flex h-12 w-12 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Uploading...</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Indexing and embedding your document</p>
          </div>
        </div>
      )

    case "success":
      return <SuccessCard result={phase.result} indexedAt={phase.indexedAt} />

    case "error":
      return <ErrorCard message={phase.message} />

    default:
      return null
  }
})
