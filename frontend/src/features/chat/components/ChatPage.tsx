import { useState } from "react"

import { FileUp, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatSession } from "@/features/chat/hooks/useChatSession"
import { DocumentUploadPanel } from "@/features/documents/components/DocumentUploadPanel"

import { ChatLayout } from "./ChatLayout"

/**
 * Chat page entry point.
 *
 * Layout:
 *  - md+ (≥ 768 px): two-column row — chat (flex-1) + upload sidebar (w-80).
 *  - < md (mobile):  chat fills full width; sidebar is a slide-in fixed overlay
 *    triggered by a floating "Upload" pill button.
 *
 * ChatLayout is unchanged — its h-[calc(100vh-4rem)] fills the left column on
 * desktop and the full viewport on mobile.
 */
export function ChatPage() {
  const { messages, isLoading, error, sendMessage, clearError } = useChatSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* Mobile backdrop — closes sidebar on tap outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Chat area */}
        <div className="min-w-0 flex-1">
          <ChatLayout
            messages={messages}
            onSend={sendMessage}
            isLoading={isLoading}
            error={error}
            onClearError={clearError}
          />
        </div>

        {/* Upload sidebar
            Mobile  : fixed overlay, slides in from the right.
            Desktop : static in-flow, always visible. */}
        <aside
          aria-label="Document upload panel"
          className={cn(
            "w-80 shrink-0 border-l bg-card",
            // Mobile: slide-in from right, positioned below the app header
            "fixed bottom-0 right-0 top-16 z-30 shadow-xl",
            "transition-transform duration-200 ease-in-out",
            sidebarOpen ? "translate-x-0" : "translate-x-full",
            // Desktop md+: static in-flow, translate/shadow reset
            "md:static md:inset-auto md:z-auto md:translate-x-0 md:shadow-none",
          )}
        >
          {/* Mobile-only close button — overlaid on the panel header */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close upload panel"
            className={cn(
              "absolute right-3 top-[1.1rem] z-10 rounded p-1",
              "text-muted-foreground hover:bg-accent hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "md:hidden",
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <DocumentUploadPanel />
        </aside>
      </div>

      {/* Mobile floating upload toggle — visible only when sidebar is closed */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open document upload panel"
          className={cn(
            "fixed bottom-28 right-4 z-10",
            "flex items-center gap-2 rounded-full bg-primary px-4 py-2.5",
            "text-sm font-medium text-primary-foreground shadow-lg",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "md:hidden",
          )}
        >
          <FileUp className="h-4 w-4" aria-hidden="true" />
          Upload
        </button>
      )}
    </>
  )
}
