import { useCallback, useState } from "react"

import { chat } from "@/features/rag/rag-api"
import { ApiError, useApiClient } from "@/shared/api-client"

import type { Message } from "../types"

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ChatSessionState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  clearError: () => void
}

// ---------------------------------------------------------------------------
// Error message helpers — keeps the hook readable and the UI consistent
// ---------------------------------------------------------------------------

function resolveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return "The AI service is currently unavailable. Please try again later."
    }
    if (err.status === 401) {
      return "Your session has expired. Please log in again."
    }
    return `Request failed (${err.status}). Please try again.`
  }
  return "An unexpected error occurred. Please try again."
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Owns the full lifecycle of a single chat session.
 *
 * - Calls useApiClient() once; all requests flow through the shared client.
 * - Translates backend ChatResponse into presentation Message objects.
 * - Keeps messages, loading, and error state in React state only.
 * - No persistence, no localStorage, no streaming.
 *
 * Integration points:
 *   ChatPage calls this hook and passes the returned values to ChatLayout.
 *   Step 5C (citations) will extend the Message type and map response.citations.
 */
export function useChatSession(): ChatSessionState {
  const api = useApiClient()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()

      // Guard: reject empty input or concurrent requests
      if (!trimmed || isLoading) return

      // 1. Optimistically append the user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      try {
        // 2. Call the RAG API via the shared client
        const response = await chat(api, { question: trimmed })

        // 3. Translate backend ChatResponse → presentation Message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          citations: response.citations.map((c) => ({
            filename: c.filename,
            chunkIndex: c.chunk_index,
            score: c.score,
            preview: c.preview,
          })),
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        // User message stays in the thread — the error is about the response,
        // not the question. The user can read what they asked and retry.
        setError(resolveErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    },
    [api, isLoading],
  )

  const clearError = useCallback(() => setError(null), [])

  return { messages, isLoading, error, sendMessage, clearError }
}
