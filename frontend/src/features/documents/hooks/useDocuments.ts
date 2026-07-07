/**
 * useDocuments — fetch, select, and delete the user's document list.
 *
 * Fetches GET /documents on mount (and whenever refresh() is called).
 * Manages selection state: one document is "active" at a time.
 * selectedDocumentId = null means "All Documents" (no filter).
 *
 * Errors from fetch are swallowed silently — the document list is supplementary
 * UI; a failure must never block the chat or upload flows.
 * Errors from deleteDocument are surfaced as a thrown exception so callers can
 * show a toast.
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { useApiClient } from "@/shared/api-client"

import { deleteDocument as deleteDocumentApi, listDocuments } from "../documents-api"
import type { DocumentItem } from "../types"

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseDocumentsReturn {
  documents: DocumentItem[]
  isLoading: boolean
  selectedDocumentId: string | null
  setSelectedDocumentId: (id: string | null) => void
  /** Re-fetch the document list from the server. */
  refresh: () => void
  /**
   * Delete a document by ID.
   * Optimistically removes it from local state, resets selection if it was
   * selected, then calls DELETE /documents/{id}.
   * Returns true on success, false on failure (caller should show a toast).
   */
  deleteDocument: (id: string) => Promise<boolean>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocuments(): UseDocumentsReturn {
  const api = useApiClient()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  // Ref so deleteDocument callback doesn't re-create on every selection change
  const selectedDocumentIdRef = useRef(selectedDocumentId)
  useEffect(() => {
    selectedDocumentIdRef.current = selectedDocumentId
  }, [selectedDocumentId])

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const docs = await listDocuments(api)
      setDocuments(docs)
    } catch {
      // Non-fatal — silently keep the previous list (or empty on first load).
    } finally {
      setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    void fetchDocuments()
  }, [fetchDocuments])

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      // Optimistic update: remove from local state immediately
      setDocuments((prev) => prev.filter((d) => d.document_id !== id))
      // Reset selection if the deleted document was selected
      if (selectedDocumentIdRef.current === id) {
        setSelectedDocumentId(null)
      }
      try {
        await deleteDocumentApi(api, id)
        return true
      } catch {
        // Roll back optimistic removal on failure
        void fetchDocuments()
        return false
      }
    },
    [api, fetchDocuments],
  )

  return {
    documents,
    isLoading,
    selectedDocumentId,
    setSelectedDocumentId,
    refresh: fetchDocuments,
    deleteDocument,
  }
}
