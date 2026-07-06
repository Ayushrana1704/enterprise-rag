"""Pydantic request and response models for all API routes.

All API contracts are defined here so that shape changes require
editing one file rather than hunting across multiple route modules.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

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
