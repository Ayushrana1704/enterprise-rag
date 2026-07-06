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
 * ─────────────────────────────────────────────────────────────────────────────
 * ABSENT BACKEND ENDPOINTS
 * The following operations were requested but do not exist in the backend:
 *   - listDocuments  → no GET /documents/ route
 *   - deleteDocument → no DELETE /documents/:id route
 * These will be implemented here once the corresponding backend routes exist.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ApiClient } from "@/shared/api-client"

import type { DocumentUploadResponse } from "./types"

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
