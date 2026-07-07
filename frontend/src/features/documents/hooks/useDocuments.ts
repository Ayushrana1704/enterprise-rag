/**
 * useDocuments — fetch and manage the user's document list.
 *
 * Fetches GET /documents on mount (and whenever refresh() is called).
 * Manages selection state: one document is "active" at a time.
 * selectedDocumentId = null means "All Documents" (no filter).
 *
 * Errors are swallowed silently — the document list is supplementary UI;
 * a failure must never block the chat or upload flows.
 */

import { useCallback, useEffect, useState } from "react"

import { useApiClient } from "@/shared/api-client"

import { listDocuments } from "../documents-api"
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
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocuments(): UseDocumentsReturn {
  const api = useApiClient()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

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

  return {
    documents,
    isLoading,
    selectedDocumentId,
    setSelectedDocumentId,
    refresh: fetchDocuments,
  }
}
