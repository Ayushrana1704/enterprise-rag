"""Pydantic request and response models for all API routes.

All API contracts are defined here so that shape changes require
editing one file rather than hunting across multiple route modules.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.auth.roles import Role


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    expires_at: datetime
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    role: Role


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


ServiceStatus = Literal["ok", "degraded", "unreachable"]


class ServiceCheck(BaseModel):
    """Status of a single downstream service."""
    status: ServiceStatus
    latency_ms: float | None = None
    detail: str | None = None


class DetailedHealthResponse(BaseModel):
    """Detailed health response with per-service status."""
    status: ServiceStatus
    service: str
    environment: str
    services: dict[str, ServiceCheck]


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

class MetricsResponse(BaseModel):
    """Platform-wide aggregate metrics for the dashboard."""
    documents_indexed: int
    conversations_count: int
    questions_asked: int
    chunks_indexed: int


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------

class RBACUserInfo(BaseModel):
    email: str
    name: str
    role: Role


class RBACResponse(BaseModel):
    resource: str
    allowed_roles: list[str]
    user: RBACUserInfo


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class DocumentUploadResponse(BaseModel):
    filename: str
    pages: int
    characters: int
    chunks: int
    first_chunk: str


# ---------------------------------------------------------------------------
# RAG
# ---------------------------------------------------------------------------

class SearchResultItem(BaseModel):
    score: float
    filename: str
    text: str


class CitationItem(BaseModel):
    filename: str
    chunk_index: int | None
    score: float
    preview: str


class ChatResponse(BaseModel):
    answer: str
    context: str
    citations: list[CitationItem]


# ---------------------------------------------------------------------------
# Streaming SSE events -- POST /rag/stream wire protocol
#
# Events are serialised as:  data: <json>\n\n
# The "type" field is the discriminator.
# These models document the contract; the route serialises via json.dumps().
# ---------------------------------------------------------------------------

class CitationsEvent(BaseModel):
    """First event -- emitted once, immediately after retrieval completes."""
    type: str = "citations"
    citations: list[CitationItem]


class TokenEvent(BaseModel):
    """One event per LLM token."""
    type: str = "token"
    delta: str


class DoneEvent(BaseModel):
    """Final event on clean completion."""
    type: str = "done"


class ErrorEvent(BaseModel):
    """Emitted in place of done when the LLM pipeline fails mid-stream."""
    type: str = "error"
    message: str


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

class ConversationCreate(BaseModel):
    """Request body for POST /conversations."""
    first_message: str = Field(min_length=1)


class ConversationRenameRequest(BaseModel):
    """Request body for PATCH /conversations/{id}."""
    title: str = Field(min_length=1, max_length=200)


class MessageResponse(BaseModel):
    """A single persisted message inside a conversation."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    citations: list[CitationItem]
    created_at: datetime


class ConversationResponse(BaseModel):
    """Summary row returned in list responses."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(ConversationResponse):
    """Full conversation including all messages."""
    messages: list[MessageResponse]
