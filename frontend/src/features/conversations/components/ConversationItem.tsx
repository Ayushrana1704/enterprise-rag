import { memo, useCallback, useEffect, useRef, useState } from "react"
import { Check, MoreHorizontal, Pencil, Pin, PinOff, Trash2, X } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Conversation } from "../types"

interface ConversationItemProps {
  conversation: Conversation
  isSelected: boolean
  isPinned: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => Promise<boolean>
  onPin: (id: string) => void
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return `${Math.floor(diffDay / 30)}mo ago`
}

type MenuState = "closed" | "open" | "confirm-delete"

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isSelected,
  isPinned,
  onSelect,
  onDelete,
  onRename,
  onPin,
}: ConversationItemProps) {
  const [menuState, setMenuState] = useState<MenuState>("closed")
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [isSavingRename, setIsSavingRename] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (menuState === "closed") return
    function onPointerDown(e: PointerEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setMenuState("closed")
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [menuState])

  // Escape closes menu
  useEffect(() => {
    if (menuState === "closed") return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setMenuState("closed"); triggerRef.current?.focus() }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [menuState])

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenaming])

  const handleRowKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isRenaming) return
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(conversation.id) }
  }, [onSelect, conversation.id, isRenaming])

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuState((p) => (p === "closed" ? "open" : "closed"))
  }, [])

  const handleStartRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuState("closed")
    setRenameValue(conversation.title)
    setIsRenaming(true)
  }, [conversation.title])

  const handleCancelRename = useCallback(() => {
    setIsRenaming(false)
    setRenameValue("")
  }, [])

  const handleSaveRename = useCallback(async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === conversation.title) {
      setIsRenaming(false)
      return
    }
    setIsSavingRename(true)
    const ok = await onRename(conversation.id, trimmed)
    setIsSavingRename(false)
    if (ok) setIsRenaming(false)
  }, [renameValue, conversation.id, conversation.title, onRename])

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); void handleSaveRename() }
    if (e.key === "Escape") { e.preventDefault(); handleCancelRename() }
  }, [handleSaveRename, handleCancelRename])

  const handlePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuState("closed")
    onPin(conversation.id)
  }, [onPin, conversation.id])

  const handleDeletePrompt = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuState("confirm-delete")
  }, [])

  const handleDeleteConfirm = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuState("closed")
    onDelete(conversation.id)
  }, [onDelete, conversation.id])

  const handleDeleteCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuState("open")
  }, [])

  return (
    <div
      role="button"
      tabIndex={isRenaming ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={`Conversation: ${conversation.title}`}
      onClick={() => { if (!isRenaming) onSelect(conversation.id) }}
      onKeyDown={handleRowKeyDown}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg py-2.5 pr-3 text-left",
        "border-l-2 transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        isSelected
          ? "border-l-primary bg-primary/10 pl-[10px] text-foreground"
          : "border-l-transparent pl-3 text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {isRenaming ? (
        /* Inline rename editor */
        <div
          className="flex flex-1 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            disabled={isSavingRename}
            className={cn(
              "h-6 flex-1 rounded border border-ring bg-background px-1.5 text-xs text-foreground",
              "outline-none focus:ring-1 focus:ring-ring",
              isSavingRename && "opacity-50",
            )}
            aria-label="Rename conversation"
            maxLength={200}
          />
          <button
            type="button"
            onClick={() => void handleSaveRename()}
            disabled={isSavingRename}
            aria-label="Save rename"
            className="rounded p-0.5 text-emerald-500 hover:bg-accent focus-visible:outline-none"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancelRename}
            disabled={isSavingRename}
            aria-label="Cancel rename"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Normal display */
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {isPinned && (
              <Pin className="h-2.5 w-2.5 shrink-0 text-primary/60" aria-hidden="true" />
            )}
            <p
              className={cn(
                "truncate pr-5 text-sm leading-snug transition-colors",
                isSelected ? "font-semibold text-foreground" : "font-medium text-foreground/75",
              )}
            >
              {conversation.title}
            </p>
          </div>
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground/60">
            {formatRelativeTime(conversation.updatedAt)}
          </p>
        </div>
      )}

      {/* Three-dot menu trigger */}
      {!isRenaming && (
        <button
          ref={triggerRef}
          type="button"
          aria-label="Conversation options"
          aria-haspopup="menu"
          aria-expanded={menuState !== "closed"}
          onClick={handleMenuToggle}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1",
            "text-transparent transition-all duration-100",
            "group-hover:text-muted-foreground/60 group-focus-within:text-muted-foreground/60",
            menuState !== "closed" && "!text-muted-foreground",
            "hover:!text-foreground hover:bg-accent",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:!text-foreground",
          )}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}

      {/* Dropdown */}
      {menuState !== "closed" && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Conversation options"
          className={cn(
            "absolute right-1 top-full z-50 mt-1 min-w-[160px]",
            "overflow-hidden rounded-xl border bg-card shadow-lg",
            "animate-in slide-in-from-top-1 fade-in duration-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {menuState === "open" ? (
            <>
              <button
                role="menuitem" type="button" onClick={handleStartRename}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                Rename
              </button>
              <button
                role="menuitem" type="button" onClick={handlePin}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                {isPinned ? (
                  <PinOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                )}
                {isPinned ? "Unpin" : "Pin"}
              </button>
              <div className="my-1 border-t" />
              <button
                role="menuitem" type="button" onClick={handleDeletePrompt}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </button>
            </>
          ) : (
            /* confirm-delete state */
            <div className="px-3 py-2.5">
              <p className="mb-2 text-xs font-medium text-foreground">Delete this conversation?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  className="flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
