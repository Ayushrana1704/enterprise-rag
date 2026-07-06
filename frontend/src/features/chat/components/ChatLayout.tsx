import { X } from "lucide-react"

import type { Message } from "@/features/chat/types"

import { ChatInput } from "./ChatInput"
import { ChatMessageList } from "./ChatMessageList"

interface ChatLayoutProps {
  messages: Message[]
  onSend: (content: string) => void
  isLoading?: boolean
  isHistoryLoading?: boolean
  error?: string | null
  onClearError?: () => void
  onCancel?: () => void
  /** Forwarded to EmptyChatState so prompt pills are clickable. */
  onSelectPrompt?: (prompt: string) => void
}

export function ChatLayout({
  messages,
  onSend,
  isLoading = false,
  isHistoryLoading = false,
  error,
  onClearError,
  onCancel,
  onSelectPrompt,
}: ChatLayoutProps) {
  return (
    // h matches the space below the sticky header (--header-h from globals.css)
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col bg-background">
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        onSelectPrompt={onSelectPrompt}
      />

      {error && (
        <div
          role="alert"
          className="shrink-0 border-t border-destructive/20 bg-destructive/10 px-4 py-2.5"
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <p className="text-sm text-destructive">{error}</p>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                aria-label="Dismiss error"
                className="shrink-0 rounded p-1 text-destructive/70 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      <ChatInput
        onSend={onSend}
        isDisabled={isLoading || isHistoryLoading}
        onCancel={onCancel}
      />
    </div>
  )
}
