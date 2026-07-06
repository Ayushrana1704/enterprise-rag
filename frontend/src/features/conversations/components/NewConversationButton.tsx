import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface NewConversationButtonProps {
  onCreate: () => void
  disabled?: boolean
}

/**
 * Presentational button that triggers conversation creation.
 * Owns no state. The parent decides when to disable it (e.g. while loading).
 */
export function NewConversationButton({
  onCreate,
  disabled = false,
}: NewConversationButtonProps) {
  return (
    <Button
      onClick={onCreate}
      disabled={disabled}
      className="w-full justify-start gap-2"
      variant="default"
      size="sm"
      aria-label="Start a new conversation"
    >
      <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>New Conversation</span>
    </Button>
  )
}
