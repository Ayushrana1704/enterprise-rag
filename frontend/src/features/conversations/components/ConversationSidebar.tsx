import { memo, useMemo, useState } from "react"
import { MessagesSquare, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Conversation } from "../types"
import { ConversationItem } from "./ConversationItem"

interface ConversationSidebarProps {
  conversations: Conversation[]
  selectedConversationId: string | null
  pinnedIds: Set<string>
  isLoading: boolean
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => Promise<boolean>
  onPin: (id: string) => void
}

export const ConversationSidebar = memo(function ConversationSidebar({
  conversations,
  selectedConversationId,
  pinnedIds,
  isLoading,
  onNew,
  onSelect,
  onDelete,
  onRename,
  onPin,
}: ConversationSidebarProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? conversations.filter((c) => c.title.toLowerCase().includes(q))
      : conversations
    // Sort: pinned first, then by updatedAt desc (conversations are already sorted by updated_at from backend)
    return [...base].sort((a, b) => {
      const ap = pinnedIds.has(a.id) ? 0 : 1
      const bp = pinnedIds.has(b.id) ? 0 : 1
      return ap - bp
    })
  }, [conversations, query, pinnedIds])

  return (
    <aside
      aria-label="Conversation history"
      className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground"
    >
      {/* Header */}
      <div className="shrink-0 px-3 pt-4 pb-2">
        <Button
          onClick={onNew}
          disabled={isLoading}
          size="sm"
          className="w-full justify-start gap-2 shadow-sm"
          aria-label="Start a new conversation"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          New Conversation
        </Button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 pb-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search conversations"
            className={cn(
              "w-full rounded-lg border bg-background/50 py-1.5 pl-8 pr-3 text-xs",
              "text-foreground placeholder:text-muted-foreground/50",
              "outline-none transition-shadow focus:bg-background focus:ring-2 focus:ring-ring",
            )}
          />
        </div>
      </div>

      {/* Section label */}
      <div className="shrink-0 px-4 pb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
          {query.trim()
            ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
            : "History"}
        </p>
        {!query.trim() && conversations.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground/60">
            {conversations.length}
          </span>
        )}
      </div>

      {/* List */}
      <nav
        aria-label="Conversation list"
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4"
      >
        {isLoading && conversations.length === 0 ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState hasQuery={query.trim().length > 0} />
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedConversationId}
              isPinned={pinnedIds.has(conv.id)}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onPin={onPin}
            />
          ))
        )}
      </nav>
    </aside>
  )
})

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60"
        aria-hidden="true"
      >
        <MessagesSquare className="h-5 w-5 text-muted-foreground/30" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {hasQuery ? "No matches" : "No conversations"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          {hasQuery ? "Try a different search." : "Start one above."}
        </p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading conversations"
      className="flex flex-col gap-1.5 px-1 pt-1"
    >
      {[72, 56, 80, 64].map((w, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-lg bg-accent/40"
          aria-hidden="true"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  )
}
