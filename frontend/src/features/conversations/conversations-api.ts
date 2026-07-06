/**
 * Conversations feature -- API layer.
 *
 * Typed functions that map frontend domain objects to backend HTTP calls.
 * Uses the shared API client -- no raw fetch, no auth headers, no React state.
 *
 * All functions accept an ApiClient obtained from useApiClient() in the
 * calling hook. This keeps the API layer free of React entirely and makes
 * every function trivially testable without DOM or context setup.
 *
 * Wire format note:
 *   The backend returns snake_case timestamps (created_at, updated_at) and
 *   IDs (user_id, conversation_id). Each function maps these to the camelCase
 *   presentation types defined in types.ts before returning to the caller.
 *
 * Backend source: backend/src/app/presentation/api/conversations.py
 */

import type { ApiClient } from "@/shared/api-client"

import type {
  Conversation,
  ConversationCreateRequest,
  ConversationDetail,
  ConversationMessage,
  MessageCitation,
} from "./types"

// ---------------------------------------------------------------------------
// Wire types -- match the backend JSON exactly (snake_case)
// ---------------------------------------------------------------------------

interface WireCitation {
  filename: string
  chunk_index: number | null
  score: number
  preview: string
}

interface WireMessage {
  id: string
  conversation_id: string
  role: "user" | "assistant"
  content: string
  citations: WireCitation[]
  created_at: string
}

interface WireConversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

interface WireConversationDetail extends WireConversation {
  messages: WireMessage[]
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapCitation(w: WireCitation): MessageCitation {
  return {
    filename: w.filename,
    chunkIndex: w.chunk_index,
    score: w.score,
    preview: w.preview,
  }
}

function mapMessage(w: WireMessage): ConversationMessage {
  return {
    id: w.id,
    conversationId: w.conversation_id,
    role: w.role,
    content: w.content,
    citations: w.citations.map(mapCitation),
    createdAt: w.created_at,
  }
}

function mapConversation(w: WireConversation): Conversation {
  return {
    id: w.id,
    userId: w.user_id,
    title: w.title,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }
}

function mapConversationDetail(w: WireConversationDetail): ConversationDetail {
  return {
    ...mapConversation(w),
    messages: w.messages.map(mapMessage),
  }
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch all conversations for the authenticated user, newest first.
 * Maps to: GET /conversations
 */
export async function listConversations(client: ApiClient): Promise<Conversation[]> {
  const wire = await client.get<WireConversation[]>("/conversations")
  return wire.map(mapConversation)
}

/**
 * Fetch a single conversation with its full message history.
 * Maps to: GET /conversations/:id
 */
export async function getConversation(
  client: ApiClient,
  conversationId: string,
): Promise<ConversationDetail> {
  const wire = await client.get<WireConversationDetail>(
    `/conversations/${conversationId}`,
  )
  return mapConversationDetail(wire)
}

/**
 * Create a new conversation. The backend auto-derives the title from
 * first_message -- no title is sent by the client.
 * Maps to: POST /conversations
 */
export async function createConversation(
  client: ApiClient,
  request: ConversationCreateRequest,
): Promise<Conversation> {
  const wire = await client.post<WireConversation>("/conversations", request)
  return mapConversation(wire)
}

/**
 * Rename a conversation.
 * Maps to: PATCH /conversations/:id
 */
export async function renameConversation(
  client: ApiClient,
  conversationId: string,
  title: string,
): Promise<Conversation> {
  const wire = await client.patch<WireConversation>(
    `/conversations/${conversationId}`,
    { title },
  )
  return mapConversation(wire)
}

/**
 * Permanently delete a conversation and all its messages.
 * Maps to: DELETE /conversations/:id
 * Returns void -- the backend responds with 204 No Content.
 */
export async function deleteConversation(
  client: ApiClient,
  conversationId: string,
): Promise<void> {
  await client.delete<void>(`/conversations/${conversationId}`)
}
