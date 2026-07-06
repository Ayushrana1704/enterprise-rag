/**
 * Markdown — lightweight renderer, no external deps.
 *
 * Supported syntax:
 *   Headings      # ## ###
 *   Bold          **text**
 *   Italic        *text* or _text_
 *   Inline code   `code`
 *   Code blocks   ```lang\n...\n```
 *   Bullet lists  - item  or  * item
 *   Ordered lists 1. item
 *   Blockquotes   > text
 *   Horizontal    ---
 *   Links         [text](url)
 *   Tables        | col | col |
 */

import { memo, useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Code block with copy button
// ---------------------------------------------------------------------------

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border bg-muted/60">
      {lang && (
        <div className="flex items-center justify-between border-b bg-muted/80 px-4 py-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">{lang}</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy code"}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {!lang && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className={cn(
            "absolute right-2 top-2 flex items-center gap-1 rounded px-2 py-0.5 text-[11px]",
            "bg-muted text-muted-foreground opacity-0 transition-all",
            "group-hover:opacity-100",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:opacity-100",
          )}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline parser — renders one line of text with inline markdown
// ---------------------------------------------------------------------------

function renderInline(text: string, key?: string): React.ReactNode {
  // Process inline patterns iteratively using a state-machine approach
  const parts: React.ReactNode[] = []
  let remaining = text
  let idx = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/s)
    // Italic *text* or _text_
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)(.*)$/s)
    const italicUMatch = remaining.match(/^(.*?)_(.+?)_(.*)$/s)
    // Inline code `code`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/s)
    // Link [text](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/s)

    // Find which match comes first
    const candidates: Array<{ idx: number; type: string; match: RegExpMatchArray }> = []

    if (boldMatch) candidates.push({ idx: boldMatch[1].length, type: "bold", match: boldMatch })
    if (italicMatch) candidates.push({ idx: italicMatch[1].length, type: "italic", match: italicMatch })
    if (italicUMatch) candidates.push({ idx: italicUMatch[1].length, type: "italicU", match: italicUMatch })
    if (codeMatch) candidates.push({ idx: codeMatch[1].length, type: "code", match: codeMatch })
    if (linkMatch) candidates.push({ idx: linkMatch[1].length, type: "link", match: linkMatch })

    if (candidates.length === 0) {
      parts.push(remaining)
      break
    }

    // Pick the earliest match
    candidates.sort((a, b) => a.idx - b.idx)
    const winner = candidates[0]

    if (winner.type === "bold") {
      const [, before, content, after] = winner.match
      if (before) parts.push(before)
      parts.push(<strong key={`b-${idx++}`} className="font-semibold">{content}</strong>)
      remaining = after
    } else if (winner.type === "italic" || winner.type === "italicU") {
      const [, before, content, after] = winner.match
      if (before) parts.push(before)
      parts.push(<em key={`i-${idx++}`}>{content}</em>)
      remaining = after
    } else if (winner.type === "code") {
      const [, before, content, after] = winner.match
      if (before) parts.push(before)
      parts.push(
        <code
          key={`c-${idx++}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {content}
        </code>,
      )
      remaining = after
    } else if (winner.type === "link") {
      const [, before, text, url, after] = winner.match
      if (before) parts.push(before)
      parts.push(
        <a
          key={`l-${idx++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {text}
        </a>,
      )
      remaining = after
    }
  }

  return parts.length === 1 ? parts[0] : <span key={key}>{parts}</span>
}

// ---------------------------------------------------------------------------
// Block-level parser
// ---------------------------------------------------------------------------

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "hr" }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; lang: string; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "p"; text: string }

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n")
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      i++ // consume closing ```
      blocks.push({ type: "code", lang, lines: codeLines })
      continue
    }

    // Headings
    if (/^### /.test(line)) {
      blocks.push({ type: "h3", text: line.slice(4) })
      i++
      continue
    }
    if (/^## /.test(line)) {
      blocks.push({ type: "h2", text: line.slice(3) })
      i++
      continue
    }
    if (/^# /.test(line)) {
      blocks.push({ type: "h1", text: line.slice(2) })
      i++
      continue
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr" })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const bqLines: string[] = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        bqLines.push(lines[i].slice(2))
        i++
      }
      blocks.push({ type: "blockquote", lines: bqLines })
      continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      blocks.push({ type: "ul", items })
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""))
        i++
      }
      blocks.push({ type: "ol", items })
      continue
    }

    // Table (line has | at start and end or multiple |)
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i])
        i++
      }
      if (tableLines.length >= 2) {
        const parseCells = (row: string) =>
          row
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim())
        const header = parseCells(tableLines[0])
        // Skip separator row (tableLines[1])
        const rows = tableLines.slice(2).map(parseCells)
        blocks.push({ type: "table", header, rows })
      }
      continue
    }

    // Empty line — skip
    if (line.trim() === "") {
      i++
      continue
    }

    // Paragraph — accumulate consecutive non-block lines
    const pLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("> ") &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !/^---+$/.test(lines[i].trim()) &&
      !(lines[i].includes("|") && lines[i].trim().startsWith("|"))
    ) {
      pLines.push(lines[i])
      i++
    }
    if (pLines.length > 0) {
      blocks.push({ type: "p", text: pLines.join(" ") })
    }
  }

  return blocks
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

function renderBlocks(blocks: Block[]): React.ReactNode[] {
  return blocks.map((block, i) => {
    switch (block.type) {
      case "h1":
        return (
          <h1 key={i} className="mb-2 mt-4 text-xl font-bold tracking-tight first:mt-0">
            {renderInline(block.text)}
          </h1>
        )
      case "h2":
        return (
          <h2 key={i} className="mb-2 mt-4 text-lg font-semibold tracking-tight first:mt-0">
            {renderInline(block.text)}
          </h2>
        )
      case "h3":
        return (
          <h3 key={i} className="mb-1.5 mt-3 text-base font-semibold first:mt-0">
            {renderInline(block.text)}
          </h3>
        )
      case "hr":
        return <hr key={i} className="my-4 border-border" />
      case "blockquote":
        return (
          <blockquote
            key={i}
            className="my-2 border-l-4 border-primary/40 pl-4 italic text-muted-foreground"
          >
            {block.lines.map((l, j) => (
              <p key={j}>{renderInline(l)}</p>
            ))}
          </blockquote>
        )
      case "code":
        return (
          <CodeBlock
            key={i}
            code={block.lines.join("\n")}
            lang={block.lang || undefined}
          />
        )
      case "ul":
        return (
          <ul key={i} className="my-2 ml-5 list-disc space-y-1 text-sm">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        )
      case "ol":
        return (
          <ol key={i} className="my-2 ml-5 list-decimal space-y-1 text-sm">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ol>
        )
      case "table":
        return (
          <div key={i} className="my-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {block.header.map((h, j) => (
                    <th
                      key={j}
                      className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
                    >
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {block.rows.map((row, j) => (
                  <tr key={j} className="hover:bg-muted/30 transition-colors">
                    {row.map((cell, k) => (
                      <td key={k} className="px-3 py-2">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case "p":
        return (
          <p key={i} className="leading-relaxed">
            {renderInline(block.text)}
          </p>
        )
      default:
        return null
    }
  })
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface MarkdownProps {
  content: string
  className?: string
}

export const Markdown = memo(function Markdown({ content, className }: MarkdownProps) {
  const blocks = parseBlocks(content)
  return (
    <div className={cn("space-y-2 text-sm", className)}>
      {renderBlocks(blocks)}
    </div>
  )
})
