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

import type { ChatRequest, ChatResponse, StreamEvent } from "./types"

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

/**
 * Stream the RAG answer as SSE events.
 * Maps to: POST /rag/stream
 *
 * Yields typed StreamEvent objects in order:
 *   citations → token (×N) → done | error
 *
 * The caller is responsible for acting on each event type.
 * Throws ApiError on non-2xx status before the stream starts.
 * AbortSignal cancellation causes an AbortError to propagate from reader.read().
 */
export async function* streamChat(
  client: ApiClient,
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent, void, unknown> {
  const response = await client.stream("/rag/stream", request, signal)

  if (!response.body) {
    throw new Error("Response body is null")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE frames are separated by double newlines
      const frames = buffer.split("\n\n")
      // Preserve the last (potentially incomplete) frame for the next read
      buffer = frames.pop() ?? ""

      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice("data: ".length)
          if (raw === "[DONE]") return

          try {
            const event = JSON.parse(raw) as StreamEvent
            yield event
          } catch {
            // Malformed frame — skip silently
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
