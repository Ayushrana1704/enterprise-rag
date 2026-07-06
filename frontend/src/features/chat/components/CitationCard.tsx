import { memo, useState, useCallback } from "react"
import { Check, ChevronDown, ChevronUp, Copy, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Citation } from "@/features/chat/types"

interface CitationCardProps {
  citation: Citation
  index: number
}

function scoreLabel(pct: number): { text: string; cls: string } {
  if (pct >= 85) return { text: "High", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" }
  if (pct >= 65) return { text: "Good", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" }
  return { text: "Low", cls: "bg-muted text-muted-foreground" }
}

export const CitationCard = memo(function CitationCard({ citation, index }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const scorePercent = Math.round(citation.score * 100)
  const { text: scoreTxt, cls: scoreCls } = scoreLabel(scorePercent)
  const chunkLabel = citation.chunkIndex != null ? `#${citation.chunkIndex + 1}` : null
  const hasPreview = Boolean(citation.preview)

  const handleCopy = useCallback(() => {
    const text = [citation.filename, citation.preview].filter(Boolean).join("\n\n")
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [citation.filename, citation.preview])

  return (
    <div
      className={cn(
        "group/card overflow-hidden rounded-xl border bg-card shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:border-primary/30",
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Index badge */}
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
          aria-label={`Source ${index + 1}`}
        >
          {index + 1}
        </span>

        {/* File icon + name */}
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
        <span
          className="min-w-0 flex-1 truncate text-xs font-medium text-foreground"
          title={citation.filename}
        >
          {citation.filename}
        </span>

        {/* Chunk */}
        {chunkLabel && (
          <span className="shrink-0 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {chunkLabel}
          </span>
        )}

        {/* Score */}
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", scoreCls)}>
          {scorePercent}% {scoreTxt}
        </span>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy citation"}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all duration-150",
            "text-muted-foreground/40 hover:bg-accent hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "opacity-0 group-hover/card:opacity-100",
          )}
        >
          {copied
            ? <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" />
            : <Copy className="h-3 w-3" aria-hidden="true" />}
        </button>
      </div>

      {/* Preview */}
      {hasPreview && (
        <div className="border-t px-3 pb-2.5 pt-2">
          <p
            className={cn(
              "text-[11px] leading-relaxed text-muted-foreground",
              !expanded && "line-clamp-2",
            )}
          >
            {citation.preview}
          </p>
          {/* Only show toggle if text would be clamped — heuristic: > 140 chars */}
          {citation.preview && citation.preview.length > 140 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                "mt-1 flex items-center gap-1 text-[10px] font-medium text-primary/70",
                "hover:text-primary transition-colors focus-visible:outline-none",
              )}
              aria-expanded={expanded}
              aria-label={expanded ? "Show less" : "Show more"}
            >
              {expanded
                ? <><ChevronUp className="h-3 w-3" aria-hidden="true" /> Less</>
                : <><ChevronDown className="h-3 w-3" aria-hidden="true" /> More</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
})
