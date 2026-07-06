# =============================================================================
# Dockerfile -- Enterprise RAG Backend
# Base:    python:3.12-slim  (Debian Bookworm, no Alpine -- torch needs glibc)
# Target:  Linux/amd64 (Render, any OCI-compatible registry)
#
# Render Start Command (set in Render dashboard, not hardcoded here):
#   alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
# =============================================================================

FROM python:3.12-slim

# -----------------------------------------------------------------------------
# 1. OS-level dependencies
#
# libgomp1
#   OpenMP runtime library required by torch for CPU-parallel operations
#   (matrix math, attention, etc.).  python:3.12-slim omits it by default;
#   without it torch raises "libgomp.so.1: cannot open shared object file".
#
# --no-install-recommends  keeps the layer small by skipping suggested pkgs.
# The apt cache is deleted in the same RUN to avoid bloating the layer.
# -----------------------------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 2. Working directory
#
# /app matches the path expected by alembic.ini (script_location = %(here)s/alembic)
# and documents.py (UPLOAD_DIR = Path("uploads") -- relative to CWD).
# All subsequent COPY, RUN, and CMD instructions resolve paths from here.
# -----------------------------------------------------------------------------
WORKDIR /app

# -----------------------------------------------------------------------------
# 3. torch -- CPU-only build (must precede requirements.txt install)
#
# WHY SEPARATE: requirements.txt does not list torch because the default PyPI
# index resolves a CUDA wheel (~2.5 GB) on platforms without GPU markers.
# The CPU-only wheel (~800 MB) lives at download.pytorch.org/whl/cpu.
#
# WHY FIRST: Installing torch before requirements.txt means the large torch
# layer is cached independently. If only requirements.txt changes later,
# Docker reuses the torch layer and skips the ~3-minute torch download.
#
# The dev venv contained torch-2.12.1-cp314-cp314-win_amd64.whl which is
# incompatible with Linux. This install fetches the correct Linux wheel.
# -----------------------------------------------------------------------------
COPY requirements.txt .

RUN pip install --no-cache-dir \
        torch==2.12.1+cpu \
        --extra-index-url https://download.pytorch.org/whl/cpu

# -----------------------------------------------------------------------------
# 4. Python dependencies
#
# Installed after torch so that sentence-transformers' dep resolution finds
# torch already satisfied and does not re-resolve it from PyPI.
# --no-cache-dir prevents pip from writing a local wheel cache inside the
# image, saving ~50-200 MB depending on package set.
# -----------------------------------------------------------------------------
RUN pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# 5. Application package (src layout)
#
# The project uses a src/ layout ([tool.setuptools.packages.find] where=["src"]).
# Without pip install -e ., Python cannot find the 'app' package, and
# 'uvicorn app.main:app' would fail with ModuleNotFoundError.
#
# pyproject.toml and src/ are copied first (before the rest of the source).
# This means Docker can cache the installed package as a separate layer --
# it only re-runs if pyproject.toml or the source files themselves change.
# -----------------------------------------------------------------------------
COPY pyproject.toml .
COPY src/ src/

RUN pip install --no-cache-dir -e .

# -----------------------------------------------------------------------------
# 6. Alembic migrations config and source files
#
# Copied after all pip installs. Migration files change more frequently than
# dependencies; keeping them late maximises cache reuse on rebuilds.
# -----------------------------------------------------------------------------
COPY alembic/ alembic/
COPY alembic.ini .

# -----------------------------------------------------------------------------
# 7. Runtime directories
#
# documents.py hardcodes UPLOAD_DIR = Path("uploads") relative to CWD (/app).
# The directory must exist when the server starts or the first upload fails.
#
# IMPORTANT: Without a persistent volume mount, this directory is ephemeral --
# uploaded PDFs are lost on every container restart or deploy.
# On Render: attach a Disk, mount it at /app/uploads.
#
# bm25_corpus.json also defaults to CWD. Set BM25_CORPUS_PATH=/data/bm25.json
# and mount /data as a persistent disk to survive restarts.
# -----------------------------------------------------------------------------
RUN mkdir -p /app/uploads

# -----------------------------------------------------------------------------
# 8. Expose port
#
# EXPOSE is documentation only -- it does not publish the port.
# Render injects the actual port via the $PORT environment variable,
# which is passed to uvicorn in the Render Start Command.
# -----------------------------------------------------------------------------
EXPOSE 8000

# -----------------------------------------------------------------------------
# 9. Default CMD (overridden by Render Start Command in the dashboard)
#
# This CMD starts uvicorn directly with no migration step.
# In production on Render, set the Start Command to:
#
#   alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
#
# That Start Command replaces this CMD entirely at runtime.
# This default is provided so the image runs correctly in local Docker testing
# (docker run -p 8000:8000 --env-file .env <image>).
#
# --workers 1  BM25 index and model registry are held in process memory.
#              Multiple workers would diverge on BM25 state. Scale via replicas.
# -----------------------------------------------------------------------------
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
