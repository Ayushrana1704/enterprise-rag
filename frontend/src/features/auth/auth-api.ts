import { API_REQUEST_URL } from "@/shared/config"

import type { AuthSession, AuthUser, LoginCredentials } from "./types"

type LoginResponse = {
  access_token: string
  expires_at: string
  token_type: string
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const tokenResponse = await fetchJson<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  const user = await getCurrentUser(tokenResponse.access_token)

  return {
    accessToken: tokenResponse.access_token,
    expiresAt: tokenResponse.expires_at,
    user,
  }
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  return fetchJson<AuthUser>("/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

async function fetchJson<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(`${API_REQUEST_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<TResponse>
}
