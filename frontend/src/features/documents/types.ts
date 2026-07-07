/**
 * Documents feature — TypeScript interfaces.
 *
 * Two layers:
 *  - API DTOs  → mirror backend Pydantic schemas exactly (snake_case preserved)
 *  - Presentation models → camelCase, only the fields shown in the UI
 *
 * Mapping from DTO → presentation model happens in useUpload, not in components.
 */

// ---------------------------------------------------------------------------
// API DTO (mirrors backend exactly)
// ---------------------------------------------------------------------------

/** Response returned by POST /documents/upload. */
export interface DocumentUploadResponse {
  document_id: string
  filename: string
  pages: number
  characters: number
  chunks: number
  /** Raw first chunk text — not displayed in the UI. */
  first_chunk: string
}

/** One item returned by GET /documents. Mirrors backend DocumentResponse. */
export interface DocumentItem {
  document_id: string
  filename: string
  page_count: number
  chunk_count: number
  created_at: string   // ISO-8601 datetime string from the server
}

// ---------------------------------------------------------------------------
// Presentation model
// ---------------------------------------------------------------------------

/**
 * Presentation-layer upload result — mapped from DocumentUploadResponse.
 * `first_chunk` is intentionally omitted; it is not surfaced in the UI.
 */
export interface UploadResult {
  filename: string
  pages: number
  characters: number
  chunks: number
}
