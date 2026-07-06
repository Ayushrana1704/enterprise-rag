/**
 * DocumentUploadPanel — top-level document upload orchestrator.
 *
 * Composes useUpload (business logic) + UploadDropzone + UploadStatus
 * (presentation) into a complete upload experience.
 *
 * Designed to fill its parent's height (h-full). Parent is responsible for
 * constraining width and setting overflow.
 *
 * State → UI mapping:
 *  idle      → dropzone + disabled Upload button
 *  ready     → dropzone + filename badge + active Upload button
 *  uploading → dropzone (disabled) + spinner status + disabled Upload button
 *  success   → success stats + "Upload Another" button (no dropzone)
 *  error     → dropzone (for retry) + error message + disabled Upload button
 */

import { FileUp } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useUpload } from "../hooks/useUpload"
import { UploadDropzone } from "./UploadDropzone"
import { UploadStatus } from "./UploadStatus"

export function DocumentUploadPanel() {
  const { phase, selectFile, upload, reset } = useUpload()

  const isSuccess = phase.status === "success"
  const isUploading = phase.status === "uploading"
  const canUpload = phase.status === "ready"

  return (
    <div className="flex h-full flex-col">
      {/* ── Panel header ───────────────────────────────────────────────── */}
      <div className="shrink-0 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Upload Document</h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Index a PDF into the knowledge base
        </p>
      </div>

      {/* ── Panel body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {/* Dropzone — hidden after a successful upload to keep focus on stats */}
        {!isSuccess && (
          <UploadDropzone onFileSelect={selectFile} disabled={isUploading} />
        )}

        {/* Phase-specific status (filename badge / spinner / stats / error) */}
        <UploadStatus phase={phase} />

        {/* Spacer pushes the action button to the bottom */}
        <div className="flex-1" />

        {/* Action button */}
        {isSuccess ? (
          <Button variant="secondary" onClick={reset} className="w-full">
            Upload Another
          </Button>
        ) : (
          <Button
            onClick={upload}
            disabled={!canUpload}
            className="w-full"
          >
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
        )}
      </div>
    </div>
  )
}
