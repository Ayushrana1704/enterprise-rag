/**
 * Conversations feature — TypeScript interfaces.
 *
 * Mirror the backend Pydantic schemas in schemas.py.
 * All fields use camelCase regardless of the wire format; the API layer
 * is responsible for any name mapping if the backend uses snake_case.
 *
 * Backend source: backend/src/app/presentation/api/schemas.py
 *   ConversationCreate        → ConversationCreateRequest
 *   ConversationResponse      → Conversation
 *   ConversationDetailResponse → ConversationDetail
 *   MessageResponse           → ConversationMessage
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** A single citation attached to an assistant message. */
export interface MessageCitation {
  filename: string
  /** Null for documents indexed before chunk tracking was added. */
  chunkIndex: number | null
  score: number
  preview: string
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/** Body for POST /conversations. */
export interface ConversationCreateRequest {
  /** The first user message; the backend derives the conversation title from it. */
  first_message: string
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/**
 * Summary row returned by GET /conversations.
 * Does not include messages — use ConversationDetail for the full history.
 */
export interface Conversation {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

/** A single persisted message inside a conversation. */
export interface ConversationMessage {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  citations: MessageCitation[]
  createdAt: string
}

/**
 * Full conversation returned by GET /conversations/:id.
 * Extends Conversation with the complete message history.
 */
export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[]
}
