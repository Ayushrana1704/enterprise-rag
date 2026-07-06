import { useState } from "react"

import { ChevronDown, ChevronUp } from "lucide-react"

import type { Citation } from "@/features/chat/types"

import { CitationCard } from "./CitationCard"

interface CitationListProps {
  citations: Citation[]
}

/**
 * Collapsible source list rendered beneath assistant messages.
 *
 * Default state: collapsed — shows "Sources (N) ▾".
 * Expanded state: shows one CitationCard per retrieved chunk.
 *
 * Returns null when citations is empty so callers don't need to guard.
 */
export function CitationList({ citations }: CitationListProps) {
  const [open, setOpen] = useState(false)

  if (citations.length === 0) return null

  return (
    <div className="mt-1 w-full">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        Sources ({citations.length})
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {citations.map((citation, i) => (
            <CitationCard
              key={`${citation.filename}-${citation.chunkIndex ?? i}`}
              citation={citation}
            />
          ))}
        </div>
      )}
    </div>
  )
}
