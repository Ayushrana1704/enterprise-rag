/**
 * UploadStatus — phase-driven status display.
 *
 * Renders the appropriate feedback for each upload phase:
 *  idle      → null (nothing to show)
 *  ready     → selected filename badge
 *  uploading → spinner
 *  success   → stats card (filename, pages, characters, chunks)
 *  error     → error message
 *
 * Purely presentational — receives the UploadPhase union and renders it.
 * Contains no state, no API calls, no business logic.
 */

import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react"

import type { UploadPhase } from "../hooks/useUpload"
import type { UploadResult } from "../types"

// ---------------------------------------------------------------------------
// Sub-components (private)
// ---------------------------------------------------------------------------

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

function SuccessCard({ result }: { result: UploadResult }) {
  return (
    <div
      role="status"
      aria-label="Upload complete"
      className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-green-800 dark:text-green-300">
          Upload complete
        </span>
      </div>

      {/* Filename */}
      <div className="mb-3 flex items-center gap-2 rounded-md bg-white/60 px-3 py-2 dark:bg-white/5">
        <FileText
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span
          className="min-w-0 truncate text-xs font-medium text-foreground"
          title={result.filename}
        >
          {result.filename}
        </span>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-1.5">
        <StatRow label="Pages" value={result.pages} />
        <StatRow label="Characters" value={result.characters} />
        <StatRow label="Chunks indexed" value={result.chunks} />
      </div>
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        aria-hidden="true"
      />
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

export function UploadStatus({ phase }: UploadStatusProps) {
  switch (phase.status) {
    case "idle":
      return null

    case "ready":
      return (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2.5">
          <FileText
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span
            className="min-w-0 flex-1 truncate text-sm text-foreground"
            title={phase.file.name}
          >
            {phase.file.name}
          </span>
        </div>
      )

    case "uploading":
      return (
        <div
          role="status"
          aria-label="Uploading"
          className="flex items-center justify-center gap-2 py-2"
        >
          <Loader2
            className="h-4 w-4 animate-spin text-primary"
            aria-hidden="true"
          />
          <span className="text-sm text-muted-foreground">Uploading…</span>
        </div>
      )

    case "success":
      return <SuccessCard result={phase.result} />

    case "error":
      return <ErrorCard message={phase.message} />

    default:
      return null
  }
}
