/**
 * KnowledgeBasePanel
 *
 * Two-section sidebar panel:
 *  - TOP: Document browser — "All Documents" + per-document cards with selection.
 *  - BOTTOM: Upload section — compact dropzone + upload button.
 *
 * Selection state (selectedDocumentId / onSelectDocument) and the document list
 * are owned by the parent (ChatPage via useDocuments) so the chat layer can read
 * selectedDocumentId without prop-drilling through two trees.
 *
 * Each DocumentCard has three internal states:
 *   idle      — shows the document info + a hover-reveal trash icon
 *   confirm   — inline "Delete?" prompt with Yes / Cancel buttons
 *   deleting  — spinner while the DELETE request is in flight
 */

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { FileText, FileUp, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/shared/toast/ToastProvider"

import { useUpload } from "../hooks/useUpload"
import type { DocumentItem } from "../types"
import { UploadDropzone } from "./UploadDropzone"
import { UploadStatus } from "./UploadStatus"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface KnowledgeBasePanelProps {
  documents: DocumentItem[]
  isDocumentsLoading: boolean
  selectedDocumentId: string | null
  onSelectDocument: (id: string | null) => void
  onRefresh: () => void
  onDeleteDocument: (id: string) => Promise<boolean>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

// ---------------------------------------------------------------------------
// DocumentCard — self-contained delete state machine
// ---------------------------------------------------------------------------

type CardState = "idle" | "confirm" | "deleting"

interface DocumentCardProps {
  doc: DocumentItem
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => Promise<boolean>
}

function DocumentCard({ doc, isSelected, onSelect, onDelete }: DocumentCardProps) {
  const [cardState, setCardState] = useState<CardState>("idle")

  const handleTrashClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCardState("confirm")
  }, [])

  const handleConfirm = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      setCardState("deleting")
      const ok = await onDelete(doc.document_id)
      // If deletion failed, roll back to idle (parent shows the toast)
      if (!ok) setCardState("idle")
      // On success the card disappears from the list — no state update needed
    },
    [doc.document_id, onDelete],
  )

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCardState("idle")
  }, [])

  const isDeleting = cardState === "deleting"
  const isConfirm = cardState === "confirm"

  return (
    <div
      className={cn(
        "group relative w-full rounded-lg border transition-colors",
        isSelected
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-card",
        isDeleting && "opacity-60",
      )}
    >
      {/* Main clickable area */}
      <button
        type="button"
        onClick={() => !isConfirm && !isDeleting && onSelect(doc.document_id)}
        aria-pressed={isSelected}
        disabled={isDeleting}
        className={cn(
          "flex w-full items-start gap-2 px-3 py-2.5 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          !isConfirm && !isDeleting && "cursor-pointer",
          (isConfirm || isDeleting) && "cursor-default",
          !isSelected && !isConfirm && !isDeleting && "hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <FileText
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0",
            isSelected ? "text-primary" : "text-muted-foreground",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-tight">{doc.filename}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {formatDate(doc.created_at)} · {doc.page_count}p · {doc.chunk_count} chunks
          </p>
        </div>

        {/* Trash icon — visible on hover in idle state only */}
        {!isConfirm && !isDeleting && (
          <button
            type="button"
            aria-label={`Delete ${doc.filename}`}
            onClick={handleTrashClick}
            className={cn(
              "ml-1 shrink-0 rounded p-0.5",
              "text-transparent transition-colors",
              "group-hover:text-muted-foreground/50 group-hover:hover:text-destructive",
              "focus-visible:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        )}

        {/* Spinner while deleting */}
        {isDeleting && (
          <Loader2
            className="ml-1 h-3 w-3 shrink-0 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Inline confirm prompt */}
      {isConfirm && (
        <div
          className="border-t px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1.5 text-[11px] font-medium text-foreground">
            Delete this document?
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleConfirm}
              className={cn(
                "flex-1 rounded-md bg-destructive px-2 py-1",
                "text-[11px] font-medium text-destructive-foreground",
                "transition-colors hover:bg-destructive/90",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                "flex-1 rounded-md border px-2 py-1",
                "text-[11px] font-medium",
                "transition-colors hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export const KnowledgeBasePanel = memo(function KnowledgeBasePanel({
  documents,
  isDocumentsLoading,
  selectedDocumentId,
  onSelectDocument,
  onRefresh,
  onDeleteDocument,
}: KnowledgeBasePanelProps) {
  const { phase, selectFile, upload, reset } = useUpload()
  const { toast } = useToast()

  const isSuccess = phase.status === "success"
  const isUploading = phase.status === "uploading"
  const canUpload = phase.status === "ready"

  // Toast on upload terminal state transitions + auto-refresh after success
  const prevStatusRef = useRef(phase.status)
  useEffect(() => {
    const prev = prevStatusRef.current
    const curr = phase.status
    prevStatusRef.current = curr
    if (prev === curr) return

    if (curr === "success" && phase.status === "success") {
      toast(`"${phase.result.filename}" indexed successfully.`, "success")
      onRefresh()
    } else if (curr === "error" && phase.status === "error") {
      toast(phase.message, "error")
    }
  }, [phase, onRefresh, toast])

  // Wrap onDeleteDocument to show toast on failure
  const handleDelete = useCallback(
    async (id: string): Promise<boolean> => {
      const ok = await onDeleteDocument(id)
      if (ok) {
        toast("Document deleted.", "success")
      } else {
        toast("Failed to delete document. Please try again.", "error")
      }
      return ok
    },
    [onDeleteDocument, toast],
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
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
            <p className="text-[11px] text-muted-foreground">
              {documents.length === 0 && !isDocumentsLoading
                ? "No documents yet"
                : `${documents.length} document${documents.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Document list ── */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        role="listbox"
        aria-label="Documents"
      >
        {/* "All Documents" option */}
        <button
          type="button"
          role="option"
          aria-selected={selectedDocumentId === null}
          onClick={() => onSelectDocument(null)}
          className={cn(
            "mb-2 w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selectedDocumentId === null
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border bg-card hover:bg-accent hover:text-accent-foreground",
          )}
        >
          All Documents
        </button>

        {/* Loading state */}
        {isDocumentsLoading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading documents</span>
          </div>
        )}

        {/* Empty state */}
        {!isDocumentsLoading && documents.length === 0 && (
          <p className="py-4 text-center text-[11px] text-muted-foreground/60">
            Upload a PDF to get started
          </p>
        )}

        {/* Document cards */}
        {!isDocumentsLoading &&
          documents.map((doc) => (
            <div
              key={doc.document_id}
              role="option"
              aria-selected={doc.document_id === selectedDocumentId}
              className="mb-1.5"
            >
              <DocumentCard
                doc={doc}
                isSelected={doc.document_id === selectedDocumentId}
                onSelect={onSelectDocument}
                onDelete={handleDelete}
              />
            </div>
          ))}
      </div>

      {/* ── Upload section ── */}
      <div className="shrink-0 border-t">
        <div className="px-3 pb-3 pt-3">
          <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Upload PDF
          </p>

          {/* Dropzone — hidden after successful upload */}
          {!isSuccess && (
            <UploadDropzone onFileSelect={selectFile} disabled={isUploading} />
          )}

          {/* Status */}
          <UploadStatus phase={phase} />

          {/* Action button */}
          {isSuccess ? (
            <Button variant="secondary" onClick={reset} className="mt-2 w-full gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Upload Another
            </Button>
          ) : (
            <Button
              onClick={upload}
              disabled={!canUpload}
              className={cn(
                "mt-2 w-full gap-2 transition-all duration-200",
                canUpload && "shadow-sm",
              )}
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

        {!isSuccess && !isUploading && (
          <p className="border-t px-4 py-2.5 text-center text-[10px] text-muted-foreground/50">
            PDF files only · max 50 MB
          </p>
        )}
      </div>
    </div>
  )
})
