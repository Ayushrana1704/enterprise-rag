# API Reference

Base URL: `https://enterprise-rag-3x98.onrender.com`
Interactive Swagger UI: `/docs`

All protected routes require: `Authorization: Bearer <access_token>`

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | Register a new user |
| `POST` | `/auth/login` | — | Obtain JWT access token |
| `GET` | `/auth/me` | ✅ | Get current user profile |

**Login request**
```json
POST /auth/login
{ "email": "admin@enterprise.com", "password": "admin123" }
```

**Login response**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_at": "2026-07-07T21:00:00"
}
```

---

## Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/documents/upload` | ✅ | Upload and index a PDF |
| `GET` | `/documents` | ✅ | List documents owned by current user |
| `DELETE` | `/documents/{document_id}` | ✅ | Delete from PostgreSQL, Qdrant, and BM25 |

**Upload** — multipart/form-data, field name `file`, PDF only, max 50 MB.

**List response**
```json
[
  {
    "document_id": "uuid",
    "filename": "report.pdf",
    "page_count": 12,
    "chunk_count": 48,
    "created_at": "2026-07-07T18:00:00"
  }
]
```

---

## RAG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/chat` | optional | Ask a question, full JSON response |
| `POST` | `/stream` | optional | Ask a question, SSE token stream |
| `GET` | `/search` | optional | Raw hybrid search (debug) |

**Chat / Stream request**
```json
{
  "question": "What is the refund policy?",
  "conversation_id": "uuid-or-null",
  "document_id": "uuid-or-null"
}
```
`document_id` — scope retrieval to one document. Omit or `null` to search all documents.

**Chat response**
```json
{
  "answer": "The refund policy states...",
  "context": "...",
  "citations": [
    {
      "filename": "policy.pdf",
      "chunk_index": 3,
      "score": 0.91,
      "preview": "Refunds are processed within 5 business days..."
    }
  ]
}
```

**SSE stream wire protocol** (`/stream`)

Events are newline-delimited JSON: `data: <json>\n\n`

```
data: {"type": "citations", "citations": [...]}

data: {"type": "token", "delta": "The "}
data: {"type": "token", "delta": "refund "}
...
data: {"type": "done"}
```

On error: `data: {"type": "error", "message": "..."}` replaces `done`.

---

## Conversations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/conversations` | ✅ | Create a new conversation |
| `GET` | `/conversations` | ✅ | List all conversations |
| `GET` | `/conversations/{id}` | ✅ | Get conversation with full message history |
| `PATCH` | `/conversations/{id}` | ✅ | Rename a conversation |
| `DELETE` | `/conversations/{id}` | ✅ | Delete conversation and messages |

**Create request**
```json
{ "first_message": "Tell me about the annual report" }
```

---

## Health & Metrics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | — | Basic liveness |
| `GET` | `/health/detail` | — | Per-service status |
| `GET` | `/metrics` | ✅ | Aggregate platform metrics |

**Health detail response**
```json
{
  "status": "ok",
  "service": "Enterprise AI Knowledge Assistant",
  "environment": "prod",
  "services": {
    "postgresql": { "status": "ok", "latency_ms": 12.4 },
    "qdrant":     { "status": "ok", "latency_ms": 45.1 },
    "llm":        { "status": "ok", "latency_ms": 210.0 },
    "bm25":       { "status": "ok", "latency_ms": 0.2 }
  }
}
```

**Metrics response**
```json
{
  "documents_indexed": 2,
  "conversations_count": 10,
  "questions_asked": 12,
  "chunks_indexed": 9
}
```

---

## RBAC

| Method | Endpoint | Required Role |
|--------|----------|--------------|
| `GET` | `/admin` | ADMIN |
| `GET` | `/hr` | HR |
| `GET` | `/finance` | FINANCE |
| `GET` | `/employee` | EMPLOYEE, HR, FINANCE, ADMIN |

---

## Error Responses

All errors follow the standard FastAPI format:

```json
{ "detail": "Document not found." }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request / validation error |
| `401` | Missing or invalid JWT |
| `403` | Insufficient role |
| `404` | Resource not found |
| `422` | Request body validation failed |
| `500` | Internal server error |
