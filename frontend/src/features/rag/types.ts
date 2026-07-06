/**
 * RAG feature — TypeScript interfaces.
 *
 * These mirror the backend Pydantic schemas exactly.
 * Field names match the JSON keys returned by the API (snake_case preserved
 * where the backend uses it, camelCase where the backend already uses it).
 *
 * Backend source: backend/src/app/presentation/api/schemas.py
 */

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface ChatRequest {
  question: string
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/** A single source chunk that contributed to the answer. */
export interface Citation {
  filename: string
  /** Null for documents indexed before chunk tracking was added. */
  chunk_index: number | null
  score: number
  preview: string
}

/** Full response from POST /rag/chat. */
export interface ChatResponse {
  answer: string
  /** Raw context string that was sent to the LLM. */
  context: string
  citations: Citation[]
}
