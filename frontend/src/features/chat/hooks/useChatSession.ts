import { useCallback, useRef, useState } from "react"

import { streamChat } from "@/features/rag/rag-api"
import { ApiError, useApiClient } from "@/shared/api-client"

import type { Message } from "../types"

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ChatSessionState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  /**
   * Send a message and stream the response.
   * Returns true on clean completion (done event received), false otherwise.
   * conversationId is forwarded to /rag/stream for persistence; omit for stateless mode.
   */
  sendMessage: (content: string, conversationId?: string | null) => Promise<boolean>
  clearError: () => void
  cancelGeneration: () => void
  loadMessages: (messages: Message[]) => void
  clearMessages: () => void
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function resolveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) return "The AI service is currently unavailable. Please try again later."
    if (err.status === 401) return "Your session has expired. Please log in again."
    return `Request failed (${err.status}). Please try again.`
  }
  return "An unexpected error occurred. Please try again."
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatSession(): ChatSessionState {
  const api = useApiClient()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string, conversationId?: string | null): Promise<boolean> => {
      const trimmed = content.trim()
      if (!trimmed || isLoading) return false

      const controller = new AbortController()
      abortControllerRef.current = controller

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      const placeholderId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: placeholderId, role: "assistant", content: "", citations: [], isStreaming: true, timestamp: new Date() },
      ])

      setIsLoading(true)
      setError(null)

      let completed = false

      try {
        for await (const event of streamChat(
          api,
          {
            question: trimmed,
            ...(conversationId != null ? { conversation_id: conversationId } : {}),
          },
          controller.signal,
        )) {
          if (event.type === "citations") {
            const mapped = event.citations.map((c) => ({
              filename: c.filename,
              chunkIndex: c.chunk_index,
              score: c.score,
              preview: c.preview,
            }))
            setMessages((prev) =>
              prev.map((m) => (m.id === placeholderId ? { ...m, citations: mapped } : m)),
            )
          } else if (event.type === "token") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId ? { ...m, content: m.content + event.delta } : m,
              ),
            )
          } else if (event.type === "done") {
            completed = true
            setMessages((prev) =>
              prev.map((m) => (m.id === placeholderId ? { ...m, isStreaming: false } : m)),
            )
          } else if (event.type === "error") {
            throw new Error(event.message)
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Cancelled — keep partial content, no error banner
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== placeholderId))
          setError(resolveErrorMessage(err))
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId && m.isStreaming ? { ...m, isStreaming: false } : m,
          ),
        )
        setIsLoading(false)
        abortControllerRef.current = null
      }

      return completed
    },
    [api, isLoading],
  )

  const clearError = useCallback(() => setError(null), [])
  const cancelGeneration = useCallback(() => { abortControllerRef.current?.abort() }, [])
  const loadMessages = useCallback((incoming: Message[]) => { setMessages(incoming); setError(null) }, [])
  const clearMessages = useCallback(() => { setMessages([]); setError(null) }, [])

  return { messages, isLoading, error, sendMessage, clearError, cancelGeneration, loadMessages, clearMessages }
}
