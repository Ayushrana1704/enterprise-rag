/**
 * UploadDropzone — file capture surface.
 *
 * Responsibilities:
 *  - Click-to-select (hidden <input type="file">)
 *  - Drag & drop
 *  - Visual drag-over feedback
 *
 * This component does NOT validate the file type — validation is in useUpload.
 * It passes whatever the user selects to onFileSelect and the hook decides.
 */

import { useCallback, useRef, useState } from "react"

import { UploadCloud } from "lucide-react"

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
        "rounded-lg border-2 border-dashed px-6 py-10 text-center",
        "transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <UploadCloud
        className={cn(
          "h-9 w-9 transition-colors",
          isDragging ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />

      <div>
        <p className="text-sm font-medium text-foreground">
          {isDragging ? "Drop to upload" : "Click or drag & drop"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">PDF files only</p>
      </div>

      {/* Visually hidden file input — triggered programmatically.
          Value is reset after each selection so the same file can be
          re-selected (e.g. after a validation error or failed upload). */}
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
