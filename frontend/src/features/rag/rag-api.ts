/**
 * RAG feature — API layer.
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
 *   const response = await chat(api, { question: "..." })
 */

import type { ApiClient } from "@/shared/api-client"

import type { ChatRequest, ChatResponse } from "./types"

/**
 * Send a question to the RAG pipeline.
 * Maps to: POST /rag/chat
 */
export async function chat(
  client: ApiClient,
  request: ChatRequest,
): Promise<ChatResponse> {
  return client.post<ChatResponse>("/rag/chat", request)
}
