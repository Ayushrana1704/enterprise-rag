"""Conversation CRUD endpoints.

All routes require a valid Bearer token.  Business logic lives entirely in
ConversationService; these handlers only translate HTTP <-> domain.
"""

import logging

from fastapi import APIRouter, Depends, status

from app.application.chat.conversation_service import ConversationService
from app.domain.auth.user import User
from app.infrastructure.database.session import get_db
from app.infrastructure.repositories.conversation_repository import (
    ConversationRepository,
)
from app.presentation.api.auth import get_authenticated_user
from app.presentation.api.schemas import (
    CitationItem,
    ConversationCreate,
    ConversationDetailResponse,
    ConversationRenameRequest,
    ConversationResponse,
    MessageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Conversations"])


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

def get_conversation_service(db=Depends(get_db)) -> ConversationService:
    """Per-request factory: binds a DB session -> repository -> service."""
    return ConversationService(ConversationRepository(db))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_message_response(msg) -> MessageResponse:
    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        role=msg.role,
        content=msg.content,
        citations=[
            CitationItem(
                filename=c.filename,
                chunk_index=c.chunk_index,
                score=c.score,
                preview=c.preview,
            )
            for c in msg.citations
        ],
        created_at=msg.created_at,
    )


def _to_detail_response(conv) -> ConversationDetailResponse:
    return ConversationDetailResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[_to_message_response(m) for m in conv.messages],
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    body: ConversationCreate,
    user: User = Depends(get_authenticated_user),
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationResponse:
    """Create a new conversation. Title is auto-derived from first_message."""
    conv = service.create_conversation(
        user_id=user.id,
        first_message=body.first_message,
    )
    return ConversationResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
)
def list_conversations(
    user: User = Depends(get_authenticated_user),
    service: ConversationService = Depends(get_conversation_service),
) -> list[ConversationResponse]:
    """Return all conversations for the authenticated user, newest first."""
    return [
        ConversationResponse(
            id=c.id,
            user_id=c.user_id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in service.list_conversations(user.id)
    ]


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
)
def get_conversation(
    conversation_id: str,
    user: User = Depends(get_authenticated_user),
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationDetailResponse:
    """Return a single conversation with its full message history."""
    conv = service.get_conversation(conversation_id, user.id)
    return _to_detail_response(conv)


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
)
def rename_conversation(
    conversation_id: str,
    body: ConversationRenameRequest,
    user: User = Depends(get_authenticated_user),
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationResponse:
    """Rename a conversation title."""
    conv = service.rename_conversation(conversation_id, user.id, body.title)
    return ConversationResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_authenticated_user),
    service: ConversationService = Depends(get_conversation_service),
) -> None:
    """Permanently delete a conversation and all its messages."""
    service.delete_conversation(conversation_id, user.id)
