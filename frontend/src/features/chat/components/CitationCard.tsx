import type { Citation } from "@/features/chat/types"

interface CitationCardProps {
  citation: Citation
}

/**
 * Displays a single retrieved source chunk.
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │ filename.pdf       Chunk 4    92%    │  ← header (muted bg)
 *   ├──────────────────────────────────────┤
 *   │ "Preview snippet of the matched…"    │  ← body (≤ 3 lines)
 *   └──────────────────────────────────────┘
 */
export function CitationCard({ citation }: CitationCardProps) {
  const scorePercent = Math.round(citation.score * 100)
  const chunkLabel =
    citation.chunkIndex != null ? `Chunk ${citation.chunkIndex + 1}` : null

  return (
    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
        <span
          className="min-w-0 flex-1 truncate text-xs font-medium text-foreground"
          title={citation.filename}
        >
          {citation.filename}
        </span>

        {chunkLabel && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {chunkLabel}
          </span>
        )}

        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {scorePercent}%
        </span>
      </div>

      {/* Preview */}
      <p className="line-clamp-3 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {citation.preview}
      </p>
    </div>
  )
}
