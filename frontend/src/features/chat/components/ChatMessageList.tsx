import { useEffect, useRef } from "react"

import type { Message } from "@/features/chat/types"

import { ChatMessage } from "./ChatMessage"
import { EmptyChatState } from "./EmptyChatState"

interface ChatMessageListProps {
  messages: Message[]
  isLoading?: boolean
}

/** Three staggered bouncing dots styled as an assistant message bubble. */
function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Assistant is typing"
      className="flex justify-start"
    >
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm border bg-card px-4 py-3 shadow-sm sm:max-w-[70%]">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  )
}

export function ChatMessageList({ messages, isLoading = false }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to the latest content whenever the message list grows or
  // the typing indicator appears/disappears.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <EmptyChatState />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        {/* Invisible anchor — scroll target for new messages */}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  )
}
