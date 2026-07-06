import { memo, useState } from "react"
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Citation } from "@/features/chat/types"
import { CitationCard } from "./CitationCard"

interface CitationListProps {
  citations: Citation[]
}

export const CitationList = memo(function CitationList({ citations }: CitationListProps) {
  const [open, setOpen] = useState(false)

  if (citations.length === 0) return null

  return (
    <div className="mt-2 w-full max-w-2xl">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium",
          "text-muted-foreground transition-all duration-150",
          "hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-accent/50 text-foreground",
        )}
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
        <span>
          {open ? "Hide" : "View"} {citations.length} source{citations.length !== 1 ? "s" : ""}
        </span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>

      {/* Cards */}
      {open && (
        <div
          className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
          role="list"
          aria-label="Source citations"
        >
          {citations.map((citation, i) => (
            <div key={`${citation.filename}-${citation.chunkIndex ?? i}`} role="listitem">
              <CitationCard citation={citation} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
