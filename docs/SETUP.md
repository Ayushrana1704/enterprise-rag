# Environment Variables & Setup

Complete reference for all configuration options.

---

## Backend (`backend/.env`)

Copy the example file to get started:

```bash
cp backend/.env.example backend/.env
```

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `Enterprise AI Knowledge Assistant` | Display name |
| `APP_ENV` | `local` | `local` · `dev` · `staging` · `prod` |
| `APP_DEBUG` | `false` | Enable debug mode |
| `APP_LOG_LEVEL` | `INFO` | `DEBUG` · `INFO` · `WARNING` · `ERROR` |
| `BACKEND_HOST` | `0.0.0.0` | Bind host |
| `BACKEND_PORT` | `8000` | Bind port |

### JWT

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET_KEY` | `change-me` | **Must be changed in production.** Use a long random string. |
| `JWT_ALGORITHM` | `HS256` | Signing algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime in minutes |

### PostgreSQL

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+psycopg://enterprise:enterprise123@localhost:5432/enterprise_ai` | psycopg v3 URL. `postgres://` and `postgresql://` are auto-normalised. |

### Qdrant

| Variable | Default | Description |
|----------|---------|-------------|
| `QDRANT_HOST` | `localhost` | Qdrant host. Use cluster hostname for Qdrant Cloud. |
| `QDRANT_PORT` | `6333` | gRPC/REST port |
| `QDRANT_COLLECTION_NAME` | `documents` | Vector collection name |
| `QDRANT_API_KEY` | _(empty)_ | Leave empty for local. Set for Qdrant Cloud. |

### Embeddings

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_MODEL_NAME` | `BAAI/bge-m3` | HuggingFace model ID. Must be in the model registry. |
| `EMBED_PRELOAD` | `true` | `true` = load at startup (fast first request). `false` = lazy load (lower RAM at startup). |

**Model options:**

| Model | Dimensions | RAM | Use case |
|-------|-----------|-----|----------|
| `BAAI/bge-m3` | 1024 | ~1.5 GB | Local dev, high quality |
| `all-MiniLM-L6-v2` | 384 | ~90 MB | Render free tier, production |

> ⚠️ Changing the model after documents are indexed requires deleting and recreating the Qdrant collection (dimension mismatch).

### LLM

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `lm_studio` | Informational label used in logs and health checks |
| `LLM_BASE_URL` | `http://127.0.0.1:1234/v1` | OpenAI-compatible base URL (no trailing slash) |
| `LLM_API_KEY` | _(empty)_ | Bearer token. Leave empty for unauthenticated local providers. |
| `LLM_MODEL_NAME` | `gemma-3-1b-instruct` | Model identifier passed to the completions endpoint |
| `LLM_TEMPERATURE` | `0.0` | Sampling temperature (0 = deterministic) |
| `LLM_REQUEST_TIMEOUT_SECONDS` | `60` | Request timeout before the LLM call is aborted |

### Hybrid Search

| Variable | Default | Description |
|----------|---------|-------------|
| `HYBRID_SEARCH_ENABLED` | `true` | `false` falls back to dense-only retrieval without redeployment |
| `RRF_K` | `60` | RRF constant (Cormack et al. 2009). Lower = amplifies top-rank advantage. |
| `HYBRID_OVERSAMPLE_FACTOR` | `2` | Each retriever fetches `limit × factor` candidates before fusion |
| `DENSE_WEIGHT` | `1.0` | Reserved for weighted RRF (not yet applied) |
| `SPARSE_WEIGHT` | `1.0` | Reserved for weighted RRF (not yet applied) |
| `BM25_CORPUS_PATH` | `bm25_corpus.json` | Path to the persisted BM25 corpus file |

### CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `["http://localhost:5173","http://localhost:3000"]` | JSON array of allowed origins. Add your Vercel URL in production. |

---

## LLM Provider Examples

### Groq (recommended for cloud deployment)

```env
LLM_PROVIDER=groq
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL_NAME=llama-3.3-70b-versatile
```

Get a free API key at [console.groq.com](https://console.groq.com).

### LM Studio (local development)

```env
LLM_PROVIDER=lm_studio
LLM_BASE_URL=http://127.0.0.1:1234/v1
LLM_API_KEY=
LLM_MODEL_NAME=gemma-3-1b-instruct
```

Download LM Studio at [lmstudio.ai](https://lmstudio.ai), load a model, and start the local server.

### OpenAI

```env
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL_NAME=gpt-4o-mini
```

### Ollama

```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL_NAME=llama3.2
```

---

## Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL. Example: `https://enterprise-rag-3x98.onrender.com` |

In local development, the Vite dev server proxies `/api` automatically. For production Vercel deploys, `vercel.json` handles the proxy — `VITE_API_URL` is not needed.

---

## Default Admin Account

A default admin user is seeded on every startup (idempotent — safe to run multiple times):

| Field | Value |
|-------|-------|
| Email | `admin@enterprise.com` |
| Password | `admin123` |
| Role | `ADMIN` |

**Change the password immediately in production** via the auth API or database.
