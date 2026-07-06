import { MessageSquare } from "lucide-react"

const SUGGESTED_PROMPTS = [
  "Summarize the key HR policies",
  "What is the expense reimbursement process?",
  "Explain the onboarding procedure",
]

export function EmptyChatState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      {/* Icon */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
        <MessageSquare className="h-6 w-6 text-primary" />
      </div>

      {/* Heading */}
      <h2 className="text-lg font-semibold text-foreground">
        Ask your knowledge base
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Upload documents and ask questions. The AI will answer using only
        the content of your indexed files.
      </p>

      {/* Suggested prompts — visual only at this stage */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <span
            key={prompt}
            className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm"
          >
            {prompt}
          </span>
        ))}
      </div>
    </div>
  )
}
