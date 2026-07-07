# Deployment Guide

This guide covers deploying the backend to **Render** (Docker) and the frontend to **Vercel**.

---

## Architecture

```
Browser → Vercel (React SPA) → /api/* proxy → Render (FastAPI Docker)
                                                      ↓
                                              Qdrant Cloud  (vectors)
                                              Supabase/Render PG  (data)
```

---

## Backend — Render

The backend ships as a Docker image built from `backend/Dockerfile`.

### Steps

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository (`Ayushrana1704/enterprise-rag`)
3. Configure the service:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Runtime | Docker |
| Dockerfile path | `Dockerfile` |
| Branch | `main` |

4. Add all required environment variables (see [SETUP.md](SETUP.md))
5. Key overrides for Render free tier:

```env
APP_ENV=prod
EMBED_PRELOAD=false
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
QDRANT_HOST=<your-cluster>.qdrant.io
QDRANT_PORT=6333
QDRANT_API_KEY=<your-qdrant-cloud-api-key>
DATABASE_URL=postgresql+psycopg://<user>:<pass>@<host>/<db>
CORS_ORIGINS=["https://your-frontend.vercel.app"]
```

### Free Tier Notes

- Render free instances spin down after inactivity — cold starts take ~50 seconds
- Use `EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2` (384-dim, ~90 MB) instead of `BAAI/bge-m3` (1024-dim, ~1.5 GB) to stay within the 512 MB RAM limit
- Set `EMBED_PRELOAD=false` so the model loads lazily, keeping startup time low

### Dockerfile overview

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install torch --extra-index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY src/ src/
EXPOSE 8000
CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Frontend — Vercel

### Steps

1. Import the repository at [vercel.com/new](https://vercel.com/new)
2. Configure:

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

3. Add environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com
```

### SPA Routing & API Proxy

`frontend/vercel.json` is pre-configured:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://enterprise-rag-3x98.onrender.com/$1" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ]
}
```

Update the backend URL to match your Render service URL before deploying.

### Auto-deploy

Vercel auto-deploys on every push to `main`. Preview deployments are created for pull requests.

---

## Local Development — Docker Compose

Spin up PostgreSQL and Qdrant locally:

```bash
docker-compose up -d
```

| Service | Port |
|---------|------|
| PostgreSQL | 5432 |
| Qdrant | 6333, 6334 |

The backend and frontend still run natively for hot-reload:

```bash
# Terminal 1
cd backend && uvicorn src.app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

---

## Database Migrations

Migrations are managed with Alembic. Always run after pulling new code:

```bash
cd backend
alembic upgrade head
```

To create a new migration after changing SQLAlchemy models:

```bash
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

---

## Switching LLM Providers

The backend accepts any OpenAI-compatible endpoint. Update these three env vars and restart — no code changes needed:

```env
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL_NAME=llama-3.3-70b-versatile
```

See [SETUP.md](SETUP.md) for provider-specific examples.
