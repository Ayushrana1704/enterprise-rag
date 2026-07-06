import { memo, useEffect, useRef } from "react"
import { FileUp, Loader2, RefreshCw, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/shared/toast/ToastProvider"

import { useUpload } from "../hooks/useUpload"
import { UploadDropzone } from "./UploadDropzone"
import { UploadStatus } from "./UploadStatus"

export const DocumentUploadPanel = memo(function DocumentUploadPanel() {
  const { phase, selectFile, upload, reset } = useUpload()
  const { toast } = useToast()

  const isSuccess = phase.status === "success"
  const isUploading = phase.status === "uploading"
  const canUpload = phase.status === "ready"

  // Toast on terminal state transitions
  const prevStatusRef = useRef(phase.status)
  useEffect(() => {
    const prev = prevStatusRef.current
    const curr = phase.status
    prevStatusRef.current = curr
    if (curr === prev) return
    if (curr === "success" && phase.status === "success") {
      toast(`"${phase.result.filename}" indexed successfully.`, "success")
    } else if (curr === "error" && phase.status === "error") {
      toast(phase.message, "error")
    }
  }, [phase, toast])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
            aria-hidden="true"
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-tight">Knowledge Base</h2>
            <p className="text-[11px] text-muted-foreground">Upload PDFs to index</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Dropzone — hidden after successful upload */}
        {!isSuccess && (
          <UploadDropzone onFileSelect={selectFile} disabled={isUploading} />
        )}

        {/* Status display */}
        <UploadStatus phase={phase} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action button */}
        {isSuccess ? (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={reset}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Upload Another
            </Button>
          </div>
        ) : (
          <Button
            onClick={upload}
            disabled={!canUpload}
            className={cn("w-full gap-2 transition-all duration-200", canUpload && "shadow-sm")}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Upload & Index
              </>
            )}
          </Button>
        )}
      </div>

      {/* Footer hint */}
      {!isSuccess && !isUploading && (
        <div className="shrink-0 border-t px-4 py-3">
          <p className="text-center text-[10px] text-muted-foreground/50">
            PDF files only · max 50 MB
          </p>
        </div>
      )}
    </div>
  )
})
