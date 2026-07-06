import { memo, useEffect, useRef } from "react"
import { BrainCircuit } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Message } from "@/features/chat/types"

import { ChatMessage } from "./ChatMessage"
import { EmptyChatState } from "./EmptyChatState"

interface ChatMessageListProps {
  messages: Message[]
  isLoading?: boolean
  isHistoryLoading?: boolean
  onSelectPrompt?: (prompt: string) => void
}

// ---------------------------------------------------------------------------
// Typing indicator — three bouncing dots
// ---------------------------------------------------------------------------

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Assistant is typing"
      className="flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
        aria-hidden="true"
      >
        <BrainCircuit className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Skeleton rows for history loading
// ---------------------------------------------------------------------------

function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div
      className={cn("flex w-full items-start gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" aria-hidden="true" />
      <div
        className={cn(
          "h-10 animate-pulse rounded-2xl",
          isUser ? "w-48 rounded-tr-sm bg-primary/20" : "w-64 rounded-tl-sm bg-muted",
        )}
        aria-hidden="true"
      />
    </div>
  )
}

function HistoryLoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading conversation history"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6"
    >
      <MessageSkeleton isUser />
      <MessageSkeleton />
      <MessageSkeleton isUser />
      <MessageSkeleton />
      <MessageSkeleton isUser />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main list
// ---------------------------------------------------------------------------

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  isLoading = false,
  isHistoryLoading = false,
  onSelectPrompt,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Smooth scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isLoading])

  // Instant scroll during streaming
  const streamingContent = messages[messages.length - 1]?.isStreaming
    ? (messages[messages.length - 1]?.content ?? "")
    : ""

  useEffect(() => {
    if (streamingContent !== "") {
      bottomRef.current?.scrollIntoView({ behavior: "auto" })
    }
  }, [streamingContent])

  if (isHistoryLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <HistoryLoadingSkeleton />
      </div>
    )
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <EmptyChatState onSelectPrompt={onSelectPrompt} />
      </div>
    )
  }

  return (
    // flex-1 + overflow-y-auto = only this element scrolls; input stays pinned
    <div className="flex-1 overflow-y-auto">
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6"
        role="log"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (messages[messages.length - 1]?.content ?? "").length === 0 && (
          <TypingIndicator />
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  )
})
