/**
 * Chat feature — presentation-layer types.
 *
 * These types model the UI conversation thread.
 * They are intentionally separate from the API-layer ChatResponse type.
 * useChatSession translates API responses into these types.
 */

export type MessageRole = "user" | "assistant"

/**
 * Presentation-layer citation — mapped from the RAG API Citation DTO.
 *
 * Field names use camelCase (vs the backend's snake_case chunk_index).
 * All mapping occurs in useChatSession; components never import from rag/types.
 */
export interface Citation {
  filename: string
  /** One-based display index; null for documents indexed before chunk tracking. */
  chunkIndex: number | null
  /** Cosine similarity in [0, 1]. */
  score: number
  /** Short preview snippet of the matched chunk (≤ 300 chars). */
  preview: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  /** Populated on assistant messages when the backend returns source citations. */
  citations?: Citation[]
  /**
   * True while this assistant message is still receiving tokens from the stream.
   * Undefined (falsy) on all user messages and on completed assistant messages.
   */
  isStreaming?: boolean
}
