import { X } from "lucide-react"

import type { Message } from "@/features/chat/types"

import { ChatInput } from "./ChatInput"
import { ChatMessageList } from "./ChatMessageList"

interface ChatLayoutProps {
  messages: Message[]
  onSend: (content: string) => void
  isLoading?: boolean
  /** Error string from useChatSession. Null/undefined = no banner rendered. */
  error?: string | null
  /** Called when the user dismisses the error banner. */
  onClearError?: () => void
}

/**
 * Full-height chat layout.
 *
 * Uses h-[calc(100vh-4rem)] to claim exactly the viewport space below the
 * AppHeader (h-16 = 4rem) without modifying the AppShell layout.
 *
 * Structure:
 *   ┌─────────────────────┐  ↑
 *   │  ChatMessageList    │  flex-1, overflow-y-auto
 *   ├─────────────────────┤
 *   │  ErrorBanner        │  shrink-0, conditional
 *   ├─────────────────────┤
 *   │  ChatInput          │  shrink-0, pinned to bottom
 *   └─────────────────────┘  ↓ h-[calc(100vh-4rem)]
 */
export function ChatLayout({
  messages,
  onSend,
  isLoading = false,
  error,
  onClearError,
}: ChatLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <ChatMessageList messages={messages} isLoading={isLoading} />

      {/* Error banner — sits between messages and input, only when error is present */}
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

      <ChatInput onSend={onSend} isDisabled={isLoading} />
    </div>
  )
}
