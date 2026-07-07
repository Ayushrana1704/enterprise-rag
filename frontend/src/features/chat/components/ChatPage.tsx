import { useCallback, useEffect, useRef, useState } from "react"
import { FileUp, X } from "lucide-react"

import { ConversationSidebar } from "@/features/conversations/components/ConversationSidebar"
import { getConversation } from "@/features/conversations/conversations-api"
import { useConversations } from "@/features/conversations/hooks/useConversations"
import type { ConversationMessage } from "@/features/conversations/types"
import { KnowledgeBasePanel } from "@/features/documents/components/KnowledgeBasePanel"
import { useDocuments } from "@/features/documents/hooks/useDocuments"
import { cn } from "@/lib/utils"
import { useApiClient } from "@/shared/api-client"
import { useToast } from "@/shared/toast/ToastProvider"

import { useChatSession } from "@/features/chat/hooks/useChatSession"
import type { Citation, Message } from "@/features/chat/types"
import { ChatLayout } from "./ChatLayout"

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapHistoryMessage(m: ConversationMessage): Message {
  const citations: Citation[] = m.citations.map((c) => ({
    filename: c.filename,
    chunkIndex: c.chunkIndex,
    score: c.score,
    preview: c.preview,
  }))
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.createdAt),
    citations: citations.length > 0 ? citations : undefined,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatPage() {
  const api = useApiClient()
  const { toast } = useToast()

  const {
    messages,
    isLoading: chatLoading,
    error,
    sendMessage,
    clearError,
    cancelGeneration,
    loadMessages,
    clearMessages,
  } = useChatSession()

  const {
    conversations,
    selectedConversationId,
    pinnedIds,
    isLoading: convsLoading,
    loadConversations,
    selectConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    pinConversation,
    touchConversation,
  } = useConversations()

  const {
    documents,
    isLoading: docsLoading,
    selectedDocumentId,
    setSelectedDocumentId,
    refresh: refreshDocuments,
    deleteDocument,
  } = useDocuments()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  useEffect(() => { void loadConversations() }, [loadConversations])

  const prevErrorRef = useRef<string | null>(null)
  useEffect(() => {
    if (error !== null && error !== prevErrorRef.current) toast(error, "error")
    prevErrorRef.current = error ?? null
  }, [error, toast])

  const handleNewConversation = useCallback(() => {
    cancelGeneration(); selectConversation(null); clearMessages()
  }, [cancelGeneration, selectConversation, clearMessages])

  const handleSelectConversation = useCallback(async (id: string) => {
    cancelGeneration(); selectConversation(id); clearMessages()
    setIsHistoryLoading(true)
    try {
      const detail = await getConversation(api, id)
      loadMessages(detail.messages.map(mapHistoryMessage))
    } catch { /* non-fatal */ }
    finally { setIsHistoryLoading(false) }
  }, [api, cancelGeneration, selectConversation, clearMessages, loadMessages])

  const handleSendMessage = useCallback(async (content: string) => {
    let convId = selectedConversationId
    if (convId === null) {
      const created = await createConversation(content)
      if (created === null) return
      convId = created.id
    }
    const completed = await sendMessage(content, convId, selectedDocumentId)
    if (completed) touchConversation(convId)
  }, [selectedConversationId, selectedDocumentId, createConversation, sendMessage, touchConversation])

  const handleDeleteConversation = useCallback(async (id: string) => {
    const wasActive = id === selectedConversationId
    const ok = await deleteConversation(id)
    if (ok) {
      if (wasActive) clearMessages()
      toast("Conversation deleted.", "success")
    } else {
      toast("Failed to delete conversation. Please try again.", "error")
    }
  }, [selectedConversationId, deleteConversation, clearMessages, toast])

  const handleRenameConversation = useCallback(async (id: string, title: string): Promise<boolean> => {
    const ok = await renameConversation(id, title)
    if (!ok) toast("Failed to rename. Please try again.", "error")
    return ok
  }, [renameConversation, toast])

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex h-[calc(100vh-var(--header-h))] overflow-hidden">
        {/* Conversation sidebar -- desktop only */}
        <div className="hidden lg:flex">
          <ConversationSidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            pinnedIds={pinnedIds}
            isLoading={convsLoading}
            onNew={handleNewConversation}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
            onPin={pinConversation}
          />
        </div>

        {/* Chat area */}
        <div className="min-w-0 flex-1">
          <ChatLayout
            messages={messages}
            onSend={handleSendMessage}
            isLoading={chatLoading}
            isHistoryLoading={isHistoryLoading}
            error={error}
            onClearError={clearError}
            onCancel={cancelGeneration}
            onSelectPrompt={handleSendMessage}
          />
        </div>

        {/* Upload sidebar */}
        <aside
          aria-label="Document upload panel"
          className={cn(
            "w-72 shrink-0 border-l bg-sidebar text-sidebar-foreground",
            "fixed bottom-0 right-0 z-30 shadow-2xl",
            "top-[var(--header-h)]",
            "transition-transform duration-200 ease-in-out",
            sidebarOpen ? "translate-x-0" : "translate-x-full",
            "md:static md:inset-auto md:z-auto md:translate-x-0 md:shadow-none",
          )}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close upload panel"
            className={cn(
              "absolute right-3 top-3 z-10 rounded-lg p-1.5",
              "text-muted-foreground hover:bg-accent hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "md:hidden",
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <KnowledgeBasePanel
            documents={documents}
            isDocumentsLoading={docsLoading}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={setSelectedDocumentId}
            onRefresh={refreshDocuments}
            onDeleteDocument={deleteDocument}
          />
        </aside>
      </div>

      {/* Mobile upload FAB */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open document upload panel"
          className={cn(
            "fixed bottom-28 right-4 z-10",
            "flex items-center gap-2 rounded-full bg-primary px-4 py-2.5",
            "text-sm font-medium text-primary-foreground shadow-lg",
            "transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95",
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
