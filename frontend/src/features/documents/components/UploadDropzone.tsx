/**
 * UploadDropzone — file capture surface.
 *
 * Responsibilities:
 *  - Click-to-select (hidden <input type="file">)
 *  - Drag & drop with animated feedback
 *  - Visual drag-over state
 *
 * Does NOT validate file type -- validation is in useUpload.
 */

import { useCallback, useRef, useState } from "react"
import { FileUp, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function UploadDropzone({
  onFileSelect,
  disabled = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (disabled || !files || files.length === 0) return
      onFileSelect(files[0])
    },
    [disabled, onFileSelect],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragging(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!disabled && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault()
        inputRef.current?.click()
      }
    },
    [disabled],
  )

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload PDF — click or drag and drop"
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer select-none flex-col items-center justify-center gap-3",
        "rounded-xl border-2 border-dashed px-6 py-10 text-center",
        "outline-none transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragging
          ? "scale-[1.02] border-primary bg-primary/8 shadow-lg shadow-primary/10"
          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {/* Icon — animates on drag */}
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200",
          isDragging ? "scale-110 bg-primary/15" : "bg-muted",
        )}
        aria-hidden="true"
      >
        {isDragging ? (
          <FileUp className="h-6 w-6 text-primary animate-bounce" />
        ) : (
          <UploadCloud className="h-6 w-6 text-muted-foreground/60" />
        )}
      </div>

      <div>
        <p
          className={cn(
            "text-sm font-medium transition-colors",
            isDragging ? "text-primary" : "text-foreground",
          )}
        >
          {isDragging ? "Drop to upload" : "Click or drag & drop"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">PDF files only · max 50 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
        disabled={disabled}
      />
    </div>
  )
}
