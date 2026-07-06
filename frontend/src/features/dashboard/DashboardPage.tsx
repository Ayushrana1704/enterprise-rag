import { Activity, Boxes, BrainCircuit, Database, Server } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  StatusCard,
  type StatusTone,
} from "@/features/dashboard/components/StatusCard"
import { API_DISPLAY_URL, API_REQUEST_URL, APP_ENVIRONMENT, APP_VERSION } from "@/shared/config"

type BackendState = "checking" | "connected" | "disconnected"

export function DashboardPage() {
  const [backendState, setBackendState] = useState<BackendState>("checking")

  useEffect(() => {
    const controller = new AbortController()

    async function checkBackend() {
      try {
        const response = await fetch(`${API_REQUEST_URL}/health`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        })
        setBackendState(response.ok ? "connected" : "disconnected")
      } catch {
        if (!controller.signal.aborted) {
          setBackendState("disconnected")
        }
      }
    }

    checkBackend()

    return () => controller.abort()
  }, [])

  const backendStatus = useMemo(() => {
    if (backendState === "checking") return { label: "Checking", tone: "blue" as StatusTone }
    if (backendState === "connected") return { label: "Connected", tone: "green" as StatusTone }
    return { label: "Disconnected", tone: "red" as StatusTone }
  }, [backendState])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">

      {/* Page header */}
      <header className="rounded-2xl border bg-card p-6 shadow-enterprise sm:p-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Enterprise AI Knowledge Assistant
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-5xl">
          Production-Ready Enterprise RAG Platform
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Operational foundation for secure knowledge retrieval, observability, and future AI
          orchestration.
        </p>
      </header>

      {/* System status */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">System Status</h2>
          <p className="text-sm text-muted-foreground">Live foundation checks</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            title="Backend"
            description="FastAPI service"
            status={backendStatus.label}
            tone={backendStatus.tone}
            icon={Server}
          />
          <StatusCard
            title="PostgreSQL"
            description="Relational persistence"
            status="Coming Soon"
            tone="yellow"
            icon={Database}
          />
          <StatusCard
            title="Qdrant"
            description="Vector database"
            status="Coming Soon"
            tone="yellow"
            icon={Boxes}
          />
          <StatusCard
            title="AI Service"
            description="LangChain and LangGraph"
            status="Coming Soon"
            tone="yellow"
            icon={BrainCircuit}
          />
        </div>
      </section>

      {/* Footer metadata */}
      <footer className="mt-auto pt-8">
        <div className="grid gap-3 rounded-xl border bg-card p-4 text-sm shadow-enterprise md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Version
            </p>
            <p className="mt-1 font-semibold">{APP_VERSION}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Environment
            </p>
            <p className="mt-1 font-semibold">{APP_ENVIRONMENT}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              API URL
            </p>
            <p className="mt-1 break-all font-semibold">{API_DISPLAY_URL}</p>
          </div>
        </div>
      </footer>

    </section>
  )
}
