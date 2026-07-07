/**
 * Documents feature — API layer.
 *
 * Typed methods that translate frontend models into backend requests.
 * Uses the shared API client for all networking — no fetch, no auth headers,
 * no error handling here.
 *
 * Callers (React hooks) obtain a client via useApiClient() and pass it in.
 * This keeps the API layer free of React entirely.
 *
 * Usage (from a future React hook):
 *   const api = useApiClient()
 *   const result = await uploadDocument(api, file)
 *
 */

import type { ApiClient } from "@/shared/api-client"

import type { DocumentItem, DocumentUploadResponse } from "./types"

/**
 * Upload a PDF file for processing and indexing.
 * Maps to: POST /documents/upload
 *
 * The file is sent as multipart/form-data under the field name "file",
 * matching the FastAPI UploadFile parameter in the backend route.
 * Content-Type is set by the browser automatically (includes the boundary).
 */
export async function uploadDocument(
  client: ApiClient,
  file: File,
): Promise<DocumentUploadResponse> {
  const formData = new FormData()
  formData.append("file", file)
  return client.postForm<DocumentUploadResponse>("/documents/upload", formData)
}

/**
 * Fetch all documents owned by the authenticated user, newest first.
 * Maps to: GET /documents
 */
export async function listDocuments(client: ApiClient): Promise<DocumentItem[]> {
  return client.get<DocumentItem[]>("/documents")
}

/**
 * Permanently delete a document and all its indexed data.
 * Maps to: DELETE /documents/{document_id}
 *
 * Returns void on success (204 No Content).
 * Throws ApiError on failure (404 if not found / not owned, 5xx on server error).
 */
export async function deleteDocument(client: ApiClient, documentId: string): Promise<void> {
  return client.delete<void>(`/documents/${documentId}`)
}
