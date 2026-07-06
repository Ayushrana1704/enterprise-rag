import { memo } from "react"
import { ArrowRight, BookOpen, BrainCircuit, FileSearch, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const FEATURES = [
  {
    icon: FileSearch,
    title: "Semantic search",
    description: "Finds relevant content across all indexed documents, not just keywords.",
  },
  {
    icon: BookOpen,
    title: "Source citations",
    description: "Every answer links back to the exact document chunk it came from.",
  },
  {
    icon: Sparkles,
    title: "Synthesis",
    description: "Combines information from multiple sources into one coherent answer.",
  },
]

const SUGGESTED_PROMPTS = [
  "Summarize the key HR policies",
  "What is the expense reimbursement process?",
  "Explain the onboarding procedure",
  "What are the IT security guidelines?",
]

interface EmptyChatStateProps {
  onSelectPrompt?: (prompt: string) => void
}

export const EmptyChatState = memo(function EmptyChatState({ onSelectPrompt }: EmptyChatStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 animate-in fade-in duration-500">

      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        {/* Layered icon */}
        <div className="relative mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-sm ring-1 ring-primary/20">
            <BrainCircuit className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow"
            aria-hidden="true"
          >
            AI
          </span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Ask your knowledge base</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Ask any question and receive answers grounded in your indexed documents,
          complete with source citations you can verify.
        </p>
      </div>

      {/* Feature cards */}
      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className={cn(
              "flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm",
              "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20",
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      {/* Suggested prompts */}
      <div className="mt-8 w-full max-w-lg">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Try asking
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTED_PROMPTS.map((prompt) =>
            onSelectPrompt ? (
              <button
                key={prompt}
                type="button"
                onClick={() => onSelectPrompt(prompt)}
                className={cn(
                  "group flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5",
                  "text-xs font-medium text-muted-foreground shadow-sm",
                  "transition-all duration-150 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {prompt}
                <ArrowRight
                  className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <span
                key={prompt}
                className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm"
              >
                {prompt}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  )
})
