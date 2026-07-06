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
  filename: string
  pages: number
  characters: number
  chunks: number
  /** Raw first chunk text — not displayed in the UI. */
  first_chunk: string
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
