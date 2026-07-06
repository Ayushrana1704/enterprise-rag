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
  | { status: "success"; result: UploadResult; indexedAt: Date }
  | { status: "error"; message: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
}

function resolveUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return "The file could not be processed. Make sure it is a valid PDF."
    if (err.status === 503) return "The document service is temporarily unavailable. Please try again later."
    return `Upload failed (${err.status}). Please try again.`
  }
  return "An unexpected error occurred. Please try again."
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseUploadReturn {
  phase: UploadPhase
  selectFile: (file: File) => void
  upload: () => Promise<void>
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUpload(): UseUploadReturn {
  const api = useApiClient()
  const [phase, setPhaseState] = useState<UploadPhase>({ status: "idle" })
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
        indexedAt: new Date(),
        result: {
          filename: response.filename,
          pages: response.pages,
          characters: response.characters,
          chunks: response.chunks,
        },
      })
    } catch (err) {
      setPhase({ status: "error", message: resolveUploadError(err) })
    }
  }, [api, setPhase])

  const reset = useCallback(() => setPhase({ status: "idle" }), [setPhase])

  return { phase, selectFile, upload, reset }
}
