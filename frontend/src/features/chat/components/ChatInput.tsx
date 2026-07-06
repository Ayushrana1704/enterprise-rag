import { SendHorizonal } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (content: string) => void
  isDisabled?: boolean
}

const MAX_HEIGHT_PX = 160 // ~6 lines before the textarea scrolls internally

export function ChatInput({ onSend, isDisabled = false }: ChatInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function adjustHeight() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    adjustHeight()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return
    onSend(trimmed)
    setValue("")
    // Reset height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const canSend = value.trim().length > 0 && !isDisabled

  return (
    <div className="shrink-0 border-t bg-card px-4 py-4">
      <div className="mx-auto max-w-3xl">
        {/* Input row */}
        <div
          className={cn(
            "flex items-end gap-3 rounded-xl border bg-background px-4 py-3",
            "transition-shadow focus-within:ring-2 focus-within:ring-ring",
          )}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents…"
            disabled={isDisabled}
            aria-label="Message input"
            className={cn(
              "flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none",
              "placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            style={{ minHeight: "1.5rem", maxHeight: `${MAX_HEIGHT_PX}px` }}
          />
          <Button
            size="icon"
            disabled={!canSend}
            onClick={submit}
            aria-label="Send message"
            className="shrink-0"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>

        {/* Keyboard hint */}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <kbd className="rounded border px-1 font-mono text-[10px]">Enter</kbd>{" "}
          to send ·{" "}
          <kbd className="rounded border px-1 font-mono text-[10px]">Shift</kbd>
          {" + "}
          <kbd className="rounded border px-1 font-mono text-[10px]">Enter</kbd>{" "}
          for new line
        </p>
      </div>
    </div>
  )
}
