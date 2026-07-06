"""Health check endpoints.

GET /health        -- basic liveness (fast, no downstream checks)
GET /health/detail -- detailed readiness check with per-service status
"""

import logging
import time

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.database.session import get_db
from app.presentation.api.schemas import (
    DetailedHealthResponse,
    HealthResponse,
    ServiceCheck,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


# ---------------------------------------------------------------------------
# Liveness probe -- fast, no downstream checks
# ---------------------------------------------------------------------------

@router.get("/health", response_model=HealthResponse)
def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Simple liveness probe. Returns immediately without touching any services."""
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
    )


# ---------------------------------------------------------------------------
# Readiness probe -- checks all downstream services
# ---------------------------------------------------------------------------

def _check_postgres(db) -> ServiceCheck:
    t0 = time.monotonic()
    try:
        db.execute(text("SELECT 1"))
        latency = round((time.monotonic() - t0) * 1000, 1)
        return ServiceCheck(status="ok", latency_ms=latency)
    except Exception as exc:
        logger.warning("PostgreSQL health check failed: %s", exc)
        return ServiceCheck(status="unreachable", detail=str(exc))


def _check_qdrant(settings: Settings) -> ServiceCheck:
    t0 = time.monotonic()
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        client.get_collections()
        latency = round((time.monotonic() - t0) * 1000, 1)
        return ServiceCheck(status="ok", latency_ms=latency)
    except Exception as exc:
        logger.warning("Qdrant health check failed: %s", exc)
        return ServiceCheck(status="unreachable", detail=str(exc))


def _check_llm(settings: Settings) -> ServiceCheck:
    """Check the configured LLM provider via GET {LLM_BASE_URL}/models.

    Uses LLM_BASE_URL directly -- no string splitting or path manipulation.
    The Authorization header is included when LLM_API_KEY is set, so this
    check works correctly for both unauthenticated local providers (LM Studio)
    and authenticated cloud providers (Groq).
    """
    t0 = time.monotonic()

    base = settings.llm_base_url.rstrip("/")
    models_url = f"{base}/models"

    api_key = settings.llm_api_key.strip()
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    try:
        response = httpx.get(models_url, headers=headers, timeout=5.0)
        latency = round((time.monotonic() - t0) * 1000, 1)
        if response.status_code < 500:
            return ServiceCheck(status="ok", latency_ms=latency)
        return ServiceCheck(
            status="degraded",
            latency_ms=latency,
            detail=f"HTTP {response.status_code}",
        )
    except httpx.ConnectError as exc:
        logger.warning("LLM service unreachable: %s", exc)
        return ServiceCheck(status="unreachable", detail="Connection refused")
    except httpx.TimeoutException:
        logger.warning("LLM service timed out during health check")
        return ServiceCheck(status="unreachable", detail="Timeout")
    except Exception as exc:
        logger.warning("LLM health check failed: %s", exc)
        return ServiceCheck(status="unreachable", detail=str(exc))


@router.get("/health/detail", response_model=DetailedHealthResponse)
def health_detail(
    settings: Settings = Depends(get_settings),
    db=Depends(get_db),
) -> DetailedHealthResponse:
    """Readiness probe that checks all downstream services.

    Runs all checks in sequence (fast enough for dashboard polling).
    Overall status is the worst of all service statuses:
      ok > degraded > unreachable
    """
    checks: dict[str, ServiceCheck] = {
        "postgres": _check_postgres(db),
        "qdrant": _check_qdrant(settings),
        "llm": _check_llm(settings),
    }

    statuses = [c.status for c in checks.values()]
    if "unreachable" in statuses:
        overall = "unreachable"
    elif "degraded" in statuses:
        overall = "degraded"
    else:
        overall = "ok"

    return DetailedHealthResponse(
        status=overall,
        service=settings.app_name,
        environment=settings.app_env,
        services=checks,
    )
