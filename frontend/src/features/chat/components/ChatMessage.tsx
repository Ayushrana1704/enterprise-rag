import { cn } from "@/lib/utils"
import type { Message } from "@/features/chat/types"

import { CitationList } from "./CitationList"

interface ChatMessageProps {
  message: Message
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const hasCitations = !isUser && (message.citations?.length ?? 0) > 0

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1 sm:max-w-[70%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm border bg-card text-card-foreground shadow-sm",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Timestamp */}
        <time className="px-1 text-xs text-muted-foreground">
          {formatTime(message.timestamp)}
        </time>

        {/* Citations — assistant messages only, hidden for user messages */}
        {hasCitations && (
          <CitationList citations={message.citations ?? []} />
        )}
      </div>
    </div>
  )
}
