import {
  Activity,
  ArrowRight,
  Boxes,
  BrainCircuit,
  Database,
  FileUp,
  MessageSquare,
  Plus,
  Server,
  Sparkles,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/AuthProvider"
import { listConversations } from "@/features/conversations/conversations-api"
import type { Conversation } from "@/features/conversations/types"
import { cn } from "@/lib/utils"
import { useApiClient } from "@/shared/api-client"
import { API_DISPLAY_URL, API_REQUEST_URL, APP_ENVIRONMENT, APP_VERSION } from "@/shared/config"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceStatus = "ok" | "degraded" | "unreachable" | "checking"
type StatusTone = "green" | "yellow" | "red" | "blue" | "neutral"

interface ServiceCheck {
  status: "ok" | "degraded" | "unreachable"
  latency_ms: number | null
  detail: string | null
}

interface DetailedHealth {
  status: "ok" | "degraded" | "unreachable"
  service: string
  environment: string
  services: {
    postgres: ServiceCheck
    qdrant: ServiceCheck
    llm: ServiceCheck
  }
}

interface Metrics {
  documents_indexed: number
  conversations_count: number
  questions_asked: number
  chunks_indexed: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const period = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const firstName = name.split(" ")[0] ?? name
  return `${period}, ${firstName}`
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return diffDay === 1 ? "yesterday" : `${diffDay}d ago`
}

function serviceStatusTone(status: ServiceStatus): StatusTone {
  if (status === "checking") return "blue"
  if (status === "ok") return "green"
  if (status === "degraded") return "yellow"
  return "red"
}

function serviceStatusLabel(status: ServiceStatus, latency?: number | null): string {
  if (status === "checking") return "Checking..."
  if (status === "ok") return latency != null ? `${latency}ms` : "OK"
  if (status === "degraded") return "Degraded"
  return "Unreachable"
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  subtext,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "blue" | "green"
  subtext?: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          tone === "blue" && "bg-primary/10 text-primary",
          tone === "green" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          tone === "default" && "bg-secondary text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        {subtext && (
          <p className="truncate text-[10px] text-muted-foreground/60">{subtext}</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatusDot
// ---------------------------------------------------------------------------

function StatusDot({ tone }: { tone: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        tone === "green" && "bg-emerald-500 shadow-sm shadow-emerald-500/40",
        tone === "yellow" && "bg-amber-400 shadow-sm shadow-amber-400/40",
        tone === "red" && "bg-rose-500 shadow-sm shadow-rose-500/40",
        tone === "blue" && "animate-pulse bg-blue-500 shadow-sm shadow-blue-500/40",
        tone === "neutral" && "bg-muted-foreground/40",
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// ServiceRow
// ---------------------------------------------------------------------------

function ServiceRow({
  icon: Icon,
  name,
  description,
  status,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  name: string
  description: string
  status: string
  tone: StatusTone
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{name}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusDot tone={tone} />
        <span className="text-xs font-medium text-muted-foreground">{status}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  {
    icon: MessageSquare,
    label: "New Conversation",
    description: "Start asking questions",
    primary: true,
  },
  {
    icon: FileUp,
    label: "Upload Document",
    description: "Index a PDF file",
    primary: false,
  },
  {
    icon: Sparkles,
    label: "Explore Knowledge",
    description: "Browse what's indexed",
    primary: false,
  },
]

function QuickActions({ onAction }: { onAction: () => void }) {
  return (
    <section aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map(({ icon: Icon, label, description, primary }) => (
          <Link
            key={label}
            to="/chat"
            onClick={onAction}
            className={cn(
              "group flex cursor-pointer items-center gap-3 rounded-xl border p-4",
              "shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              primary
                ? "border-primary/20 bg-primary/5 hover:bg-primary/10 dark:border-primary/30 dark:bg-primary/10"
                : "bg-card hover:bg-muted/40",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
                primary ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ArrowRight
              className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const api = useApiClient()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [health, setHealth] = useState<DetailedHealth | null>(null)
  const [healthChecking, setHealthChecking] = useState(true)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [convsLoading, setConvsLoading] = useState(true)

  // Detailed health check
  useEffect(() => {
    const controller = new AbortController()

    async function checkHealth() {
      try {
        const res = await fetch(`${API_REQUEST_URL}/health/detail`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
          },
        })
        if (res.ok) {
          const data = await res.json() as DetailedHealth
          setHealth(data)
        }
      } catch {
        if (!controller.signal.aborted) setHealth(null)
      } finally {
        if (!controller.signal.aborted) setHealthChecking(false)
      }
    }

    void checkHealth()
    return () => controller.abort()
  }, [session?.accessToken])

  // Metrics
  useEffect(() => {
    let cancelled = false
    api.get<Metrics>("/metrics")
      .then((data) => { if (!cancelled) setMetrics(data) })
      .catch(() => { /* metrics are non-critical */ })
    return () => { cancelled = true }
  }, [api])

  // Recent conversations
  useEffect(() => {
    let cancelled = false
    setConvsLoading(true)

    listConversations(api)
      .then((list) => { if (!cancelled) setConversations(list) })
      .catch(() => { if (!cancelled) setConversations([]) })
      .finally(() => { if (!cancelled) setConvsLoading(false) })

    return () => { cancelled = true }
  }, [api])

  // Derived service states
  const apiStatus = useMemo<{ label: string; tone: StatusTone }>(() => {
    if (healthChecking) return { label: "Checking...", tone: "blue" }
    if (health) {
      const tone = serviceStatusTone(health.status)
      return { label: health.status === "ok" ? "Connected" : "Degraded", tone }
    }
    return { label: "Unreachable", tone: "red" }
  }, [health, healthChecking])

  const pgStatus = useMemo<{ label: string; tone: StatusTone }>(() => {
    if (healthChecking) return { label: "Checking...", tone: "blue" }
    if (!health) return { label: "Unknown", tone: "neutral" }
    const s = health.services.postgres
    return { label: serviceStatusLabel(s.status, s.latency_ms), tone: serviceStatusTone(s.status) }
  }, [health, healthChecking])

  const qdrantStatus = useMemo<{ label: string; tone: StatusTone }>(() => {
    if (healthChecking) return { label: "Checking...", tone: "blue" }
    if (!health) return { label: "Unknown", tone: "neutral" }
    const s = health.services.qdrant
    return { label: serviceStatusLabel(s.status, s.latency_ms), tone: serviceStatusTone(s.status) }
  }, [health, healthChecking])

  const llmStatus = useMemo<{ label: string; tone: StatusTone }>(() => {
    if (healthChecking) return { label: "Checking...", tone: "blue" }
    if (!health) return { label: "Unknown", tone: "neutral" }
    const s = health.services.llm
    return { label: serviceStatusLabel(s.status, s.latency_ms), tone: serviceStatusTone(s.status) }
  }, [health, healthChecking])

  const recentConvs = conversations?.slice(0, 5) ?? []
  const convCount = metrics?.conversations_count ?? (conversations?.length ?? 0)

  const handleNewConversation = useCallback(() => navigate("/chat"), [navigate])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div
          className="pointer-events-none absolute right-0 top-0 h-72 w-72 -translate-y-1/3 translate-x-1/3 rounded-full bg-primary/5"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 translate-y-1/2 -translate-x-1/3 rounded-full bg-primary/3"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Enterprise AI Knowledge Platform
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {session?.user.name ? getGreeting(session.user.name) : "Welcome back"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Search, synthesize, and surface knowledge from your documents with cited,
              verifiable answers powered by enterprise-grade RAG.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button onClick={handleNewConversation} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Conversation
            </Button>
            <Button variant="secondary" asChild className="gap-2">
              <Link to="/chat">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Open Chat
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Conversations"
          value={convsLoading && !metrics ? "..." : convCount}
          icon={MessageSquare}
          tone="blue"
          subtext={convCount > 0 ? `${convCount} total` : undefined}
        />
        <StatCard
          label="Documents Indexed"
          value={metrics ? metrics.documents_indexed : "—"}
          icon={FileUp}
          tone={metrics && metrics.documents_indexed > 0 ? "green" : "default"}
          subtext={metrics ? `${metrics.chunks_indexed} chunks` : undefined}
        />
        <StatCard
          label="Questions Asked"
          value={metrics ? metrics.questions_asked : "—"}
          icon={Sparkles}
          tone={metrics && metrics.questions_asked > 0 ? "blue" : "default"}
        />
        <StatCard
          label="Platform Status"
          value={
            healthChecking ? "..."
            : health?.status === "ok" ? "Online"
            : health?.status === "degraded" ? "Degraded"
            : "Offline"
          }
          icon={Activity}
          tone={health?.status === "ok" ? "green" : "default"}
          subtext={health?.status === "ok" ? "All services healthy" : undefined}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions onAction={handleNewConversation} />

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Recent conversations */}
        <section className="lg:col-span-3" aria-labelledby="recent-conversations-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-conversations-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Conversations
            </h2>
            <Link
              to="/chat"
              className="flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {convsLoading ? (
              <div className="space-y-1 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" aria-hidden="true" />
                ))}
              </div>
            ) : recentConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground">
                  Head to the{" "}
                  <Link to="/chat" className="text-primary hover:underline">chat page</Link>
                  {" "}to get started.
                </p>
              </div>
            ) : (
              <ul role="list" className="divide-y">
                {recentConvs.map((conv) => (
                  <li key={conv.id}>
                    <Link
                      to="/chat"
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3.5 transition-all duration-150",
                        "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{conv.title}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(conv.updatedAt)}</p>
                      </div>
                      <ArrowRight
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* System status */}
        <section className="lg:col-span-2" aria-labelledby="system-status-heading">
          <h2 id="system-status-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            System Status
          </h2>
          <div className="rounded-xl border bg-card p-2 shadow-sm">
            <ServiceRow
              icon={Server}
              name="Backend API"
              description="FastAPI service"
              status={apiStatus.label}
              tone={apiStatus.tone}
            />
            <ServiceRow
              icon={Database}
              name="PostgreSQL"
              description="Relational persistence"
              status={pgStatus.label}
              tone={pgStatus.tone}
            />
            <ServiceRow
              icon={Boxes}
              name="Qdrant"
              description="Vector database"
              status={qdrantStatus.label}
              tone={qdrantStatus.tone}
            />
            <ServiceRow
              icon={BrainCircuit}
              name="LLM Service"
              description="Local inference"
              status={llmStatus.label}
              tone={llmStatus.tone}
            />
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer>
        <div className="grid gap-3 rounded-xl border bg-card p-4 text-sm shadow-sm md:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Version</p>
            <p className="mt-0.5 font-semibold">{APP_VERSION}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Environment</p>
            <p className="mt-0.5 font-semibold capitalize">{APP_ENVIRONMENT}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">API URL</p>
            <p className="mt-0.5 break-all font-semibold">{API_DISPLAY_URL}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
