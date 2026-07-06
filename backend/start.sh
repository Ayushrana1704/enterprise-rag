#!/bin/sh
# =============================================================================
# start.sh -- Production startup script for the Enterprise RAG Backend
#
# Runs inside the Docker container as the CMD entrypoint.
# Sequence:
#   1. Run Alembic migrations (fail-fast if DB is unreachable)
#   2. Start Uvicorn
#
# Environment variables consumed:
#   PORT  -- injected by Render; falls back to 8000 locally
# =============================================================================
set -e

echo "==> Running database migrations..."
alembic upgrade head
echo "==> Migrations complete."

echo "==> Starting server on port ${PORT:-8000}..."

# --workers 1
#   BM25 index and the model registry are held in process memory.
#   Multiple workers would each maintain independent in-memory state,
#   causing BM25 corpus inconsistency across workers.
#   Scale horizontally via Render replicas, not via intra-process workers.
#
# --host 0.0.0.0
#   Required inside a container; 127.0.0.1 would only accept loopback traffic.
#
# --port ${PORT:-8000}
#   Render injects $PORT dynamically. The fallback (8000) is used locally.
#
# exec replaces the shell process so uvicorn receives OS signals (SIGTERM)
# directly and can shut down cleanly.
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers 1
