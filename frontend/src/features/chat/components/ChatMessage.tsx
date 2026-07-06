import { memo, useCallback, useState } from "react"
import { BrainCircuit, Check, Copy, RotateCcw, ThumbsDown, ThumbsUp, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { Markdown } from "@/components/ui/markdown"
import { useToast } from "@/shared/toast/ToastProvider"
import type { Message } from "@/features/chat/types"

import { CitationList } from "./CitationList"

interface ChatMessageProps {
  message: Message
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

function UserAvatar() {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20"
      aria-hidden="true"
    >
      <User className="h-3.5 w-3.5" />
    </div>
  )
}

function AssistantAvatar() {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
      aria-hidden="true"
    >
      <BrainCircuit className="h-3.5 w-3.5" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hover action button
// ---------------------------------------------------------------------------

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-md transition-all duration-150",
        "text-muted-foreground/50 hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active && "text-emerald-500",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const { toast } = useToast()
  const isUser = message.role === "user"
  const hasCitations = !isUser && (message.citations?.length ?? 0) > 0
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [message.content])

  const handleThumbsUp = useCallback(() => {
    toast("Thanks for the positive feedback!", "success")
  }, [toast])

  const handleThumbsDown = useCallback(() => {
    toast("Feedback noted — we'll improve.", "info")
  }, [toast])

  const handleRegenerate = useCallback(() => {
    toast("Regeneration coming soon.", "info")
  }, [toast])

  return (
    <div
      className={cn(
        "group flex w-full items-start gap-2.5",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      {isUser ? <UserAvatar /> : <AssistantAvatar />}

      {/* Content column */}
      <div
        className={cn(
          "flex max-w-[76%] flex-col gap-1 sm:max-w-[70%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm border bg-card text-card-foreground",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="break-words">
              <Markdown content={message.content} />
              {/* Streaming cursor */}
              {message.isStreaming && (
                <span
                  className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-current align-middle"
                  aria-hidden="true"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer row: timestamp + hover actions */}
        <div
          className={cn(
            "flex items-center gap-2 px-1",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
        >
          <time
            className="text-[11px] tabular-nums text-muted-foreground/50"
            dateTime={message.timestamp.toISOString()}
          >
            {formatTime(message.timestamp)}
          </time>

          {/* Hover actions — assistant only, hidden while streaming */}
          {!isUser && !message.isStreaming && (
            <div
              className={cn(
                "flex items-center gap-0.5",
                "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
              )}
              aria-label="Message actions"
            >
              <ActionBtn
                icon={copied ? Check : Copy}
                label={copied ? "Copied" : "Copy message"}
                onClick={handleCopy}
                active={copied}
              />
              <ActionBtn icon={ThumbsUp} label="Helpful" onClick={handleThumbsUp} />
              <ActionBtn icon={ThumbsDown} label="Not helpful" onClick={handleThumbsDown} />
              <ActionBtn icon={RotateCcw} label="Regenerate" onClick={handleRegenerate} />
            </div>
          )}
        </div>

        {/* Citations — shown after streaming completes */}
        {hasCitations && !message.isStreaming && (
          <CitationList citations={message.citations ?? []} />
        )}
      </div>
    </div>
  )
})
