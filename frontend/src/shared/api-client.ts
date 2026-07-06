/**
 * Shared authenticated API client.
 *
 * Single source of truth for:
 *  - Base URL resolution
 *  - Authorization header injection
 *  - Typed error handling via ApiError
 *  - Future: token refresh, request interceptors, retry logic
 *
 * All feature API modules (rag-api, documents-api, …) call useApiClient()
 * to get a client bound to the current session token. Auth-bootstrap calls
 * (login, session restore) are handled separately in auth-api.ts because
 * they run before a token exists.
 *
 * Usage:
 *   const api = useApiClient()
 *   const result  = await api.get<ResponseType>("/some/path")
 *   const result  = await api.post<ResponseType>("/some/path", { key: "value" })
 *   const result  = await api.postForm<ResponseType>("/some/path", formData)
 */

import { useAuth } from "@/features/auth/AuthProvider"
import { API_REQUEST_URL } from "@/shared/config"

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ---------------------------------------------------------------------------
// Internal transport — not exported; callers use the hook below
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_REQUEST_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      // Caller-supplied headers last so Content-Type etc. can be set per-request.
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  if (!response.ok) {
    // TODO: intercept 401 here to trigger token refresh before re-throwing.
    throw new ApiError(
      response.status,
      `API error ${response.status}: ${response.statusText}`,
    )
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/** Convenience type for annotating props / hook return values. */
export type ApiClient = ReturnType<typeof useApiClient>

/**
 * Returns an API client bound to the current session token.
 * Must be called inside a component or custom hook that is a descendant of AuthProvider.
 */
export function useApiClient() {
  const { session } = useAuth()
  const token = session?.accessToken ?? null

  return {
    /** Authenticated GET — resolves to parsed JSON. */
    get<T>(path: string): Promise<T> {
      return request<T>(path, token, { method: "GET" })
    },

    /** Authenticated POST with a JSON body. */
    post<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(path, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    },

    /**
     * Authenticated POST with a FormData body (file uploads).
     * Content-Type is intentionally omitted — the browser sets it automatically
     * with the correct multipart boundary.
     */
    postForm<T>(path: string, formData: FormData): Promise<T> {
      return request<T>(path, token, { method: "POST", body: formData })
    },
  }
}
