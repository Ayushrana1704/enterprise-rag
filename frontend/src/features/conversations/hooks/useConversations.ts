import { useCallback, useState } from "react"

import { ApiError, useApiClient } from "@/shared/api-client"

import {
  createConversation as apiCreate,
  deleteConversation as apiDelete,
  listConversations as apiList,
  renameConversation as apiRename,
} from "../conversations-api"
import type { Conversation } from "../types"

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ConversationsState {
  conversations: Conversation[]
  selectedConversationId: string | null
  pinnedIds: Set<string>
  isLoading: boolean
  error: string | null
  loadConversations: () => Promise<void>
  selectConversation: (id: string | null) => void
  createConversation: (firstMessage: string) => Promise<Conversation | null>
  /**
   * Delete a conversation by id.
   * Returns true on success, false if the API call failed.
   * On failure, the error message is set in state but no exception is thrown.
   */
  deleteConversation: (id: string) => Promise<boolean>
  /**
   * Rename a conversation. Returns true on success.
   */
  renameConversation: (id: string, title: string) => Promise<boolean>
  /**
   * Toggle pin state for a conversation (client-side only).
   */
  pinConversation: (id: string) => void
  /**
   * Bump a conversation's updatedAt to now and move it to the top of the list.
   * Pure local state mutation -- no network call.
   * Call this after a successful streaming turn to keep the sidebar ordered.
   */
  touchConversation: (id: string) => void
  clearError: () => void
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function resolveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session has expired. Please log in again."
    if (err.status === 404) return "Conversation not found."
    if (err.status >= 500) return "Server error. Please try again later."
    return `Request failed (${err.status}). Please try again.`
  }
  return "An unexpected error occurred. Please try again."
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConversations(): ConversationsState {
  const api = useApiClient()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setConversations(await apiList(api))
    } catch (err) {
      setError(resolveErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [api])

  const selectConversation = useCallback((id: string | null) => {
    setSelectedConversationId(id)
  }, [])

  const createConversation = useCallback(
    async (firstMessage: string): Promise<Conversation | null> => {
      setIsLoading(true)
      setError(null)
      try {
        const created = await apiCreate(api, { first_message: firstMessage })
        setConversations((prev) => [created, ...prev])
        setSelectedConversationId(created.id)
        return created
      } catch (err) {
        setError(resolveErrorMessage(err))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [api],
  )

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)
      try {
        await apiDelete(api, id)
        setConversations((prev) => prev.filter((c) => c.id !== id))
        setSelectedConversationId((prev) => (prev === id ? null : prev))
        setPinnedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
        return true
      } catch (err) {
        setError(resolveErrorMessage(err))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [api],
  )

  const renameConversation = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      try {
        const updated = await apiRename(api, id, title)
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)),
        )
        return true
      } catch (err) {
        setError(resolveErrorMessage(err))
        return false
      }
    },
    [api],
  )

  const pinConversation = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  const touchConversation = useCallback((id: string) => {
    const now = new Date().toISOString()
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      if (idx === -1) return prev
      const updated: Conversation = { ...prev[idx], updatedAt: now }
      return [updated, ...prev.filter((c) => c.id !== id)]
    })
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    conversations,
    selectedConversationId,
    pinnedIds,
    isLoading,
    error,
    loadConversations,
    selectConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    pinConversation,
    touchConversation,
    clearError,
  }
}
