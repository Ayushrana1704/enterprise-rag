/**
 * KnowledgeBasePanel
 *
 * Two-section sidebar panel:
 *  - TOP: Document browser — "All Documents" + per-document cards with selection.
 *  - BOTTOM: Upload section — compact dropzone + upload button.
 *
 * Selection state (selectedDocumentId / onSelectDocument) is owned by the parent
 * so it can be read by the chat layer without prop-drilling through two trees.
 *
 * The document list (documents, isLoading, onRefresh) is also owned by the parent
 * so the parent can trigger a refresh after a successful upload from any source.
 */

import { memo, useEffect, useRef } from "react"
import { FileText, FileUp, Loader2, RefreshCw, Sparkles } from "lucide-react"

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
// Document card
// ---------------------------------------------------------------------------

interface DocumentCardProps {
  doc: DocumentItem
  isSelected: boolean
  onSelect: (id: string) => void
}

function DocumentCard({ doc, isSelected, onSelect }: DocumentCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(doc.document_id)}
      aria-pressed={isSelected}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border bg-card hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <div className="flex items-start gap-2">
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
      </div>
    </button>
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
}: KnowledgeBasePanelProps) {
  const { phase, selectFile, upload, reset } = useUpload()
  const { toast } = useToast()

  const isSuccess = phase.status === "success"
  const isUploading = phase.status === "uploading"
  const canUpload = phase.status === "ready"

  // Toast on terminal state transitions + auto-refresh after successful upload
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
