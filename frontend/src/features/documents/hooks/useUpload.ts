/**
 * Upload lifecycle hook.
 *
 * Owns:
 *  - File validation (PDF-only guard)
 *  - State machine: idle → ready → uploading → success | error
 *  - API call via the shared client
 *  - DTO → presentation model mapping
 *
 * Components receive only the opaque UploadPhase union and callback refs.
 * No business logic leaks into the presentation layer.
 */

import { useCallback, useRef, useState } from "react"

import { ApiError, useApiClient } from "@/shared/api-client"

import { uploadDocument } from "../documents-api"
import type { UploadResult } from "../types"

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export type UploadPhase =
  | { status: "idle" }
  | { status: "ready"; file: File }
  | { status: "uploading"; file: File }
  | { status: "success"; result: UploadResult }
  | { status: "error"; message: string }

// ---------------------------------------------------------------------------
// Helpers — private to this module
// ---------------------------------------------------------------------------

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  )
}

function resolveUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) {
      return "The file could not be processed. Make sure it is a valid PDF."
    }
    if (err.status === 503) {
      return "The document service is temporarily unavailable. Please try again later."
    }
    return `Upload failed (${err.status}). Please try again.`
  }
  return "An unexpected error occurred. Please try again."
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseUploadReturn {
  phase: UploadPhase
  /** Called by the dropzone when the user selects or drops a file. */
  selectFile: (file: File) => void
  /** Triggers the upload. No-op unless phase is "ready". */
  upload: () => Promise<void>
  /** Resets back to idle from any terminal state. */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUpload(): UseUploadReturn {
  const api = useApiClient()

  const [phase, setPhaseState] = useState<UploadPhase>({ status: "idle" })

  // Ref so upload() can always read the latest phase without listing it as a
  // dep (which would recreate the callback on every state change).
  const phaseRef = useRef<UploadPhase>(phase)

  const setPhase = useCallback((next: UploadPhase) => {
    phaseRef.current = next
    setPhaseState(next)
  }, [])

  const selectFile = useCallback(
    (file: File) => {
      if (!isPdf(file)) {
        setPhase({ status: "error", message: "Only PDF files are supported." })
        return
      }
      setPhase({ status: "ready", file })
    },
    [setPhase],
  )

  const upload = useCallback(async () => {
    const current = phaseRef.current
    if (current.status !== "ready") return

    const { file } = current
    setPhase({ status: "uploading", file })

    try {
      const response = await uploadDocument(api, file)
      setPhase({
        status: "success",
        result: {
          filename: response.filename,
          pages: response.pages,
          characters: response.characters,
          chunks: response.chunks,
          // response.first_chunk is intentionally omitted
        },
      })
    } catch (err) {
      setPhase({ status: "error", message: resolveUploadError(err) })
    }
  }, [api, setPhase])

  const reset = useCallback(() => setPhase({ status: "idle" }), [setPhase])

  return { phase, selectFile, upload, reset }
}
