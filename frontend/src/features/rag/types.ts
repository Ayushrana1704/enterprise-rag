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
  /** Optional — when set, the backend persists the turn to this conversation. */
  conversation_id?: string | null
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

// ---------------------------------------------------------------------------
// Streaming SSE events — POST /rag/stream
//
// Mirrors the backend schemas.py CitationsEvent / TokenEvent / DoneEvent /
// ErrorEvent discriminated union.  The "type" field is the discriminator.
// ---------------------------------------------------------------------------

export interface CitationsEvent {
  type: "citations"
  citations: Citation[]
}

export interface TokenEvent {
  type: "token"
  delta: string
}

export interface DoneEvent {
  type: "done"
}

export interface ErrorEvent {
  type: "error"
  message: string
}

/** Discriminated union of all SSE event shapes emitted by /rag/stream. */
export type StreamEvent = CitationsEvent | TokenEvent | DoneEvent | ErrorEvent
