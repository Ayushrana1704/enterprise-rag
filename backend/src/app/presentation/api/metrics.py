"""Platform metrics endpoint.

GET /metrics  -- aggregate counts for the dashboard (documents, conversations, etc.)
Requires authentication.
"""

import logging

from fastapi import APIRouter, Depends

from app.domain.auth.user import User
from app.infrastructure.database.session import get_db
from app.infrastructure.models.conversation import ConversationModel, MessageModel
from app.presentation.api.auth import get_authenticated_user
from app.presentation.api.dependencies import get_bm25_service
from app.presentation.api.schemas import MetricsResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Metrics"])


@router.get("/metrics", response_model=MetricsResponse)
def get_metrics(
    user: User = Depends(get_authenticated_user),
    db=Depends(get_db),
    bm25=Depends(get_bm25_service),
) -> MetricsResponse:
    """Return platform-wide aggregate counts.

    Counts are scoped to the authenticated user so each user sees their
    own activity, not the entire platform.
    """
    # Conversations owned by this user
    conversations_count: int = (
        db.query(ConversationModel)
        .filter(ConversationModel.user_id == user.id)
        .count()
    )

    # Questions asked = user-role messages across this user's conversations
    questions_asked: int = (
        db.query(MessageModel)
        .join(ConversationModel, MessageModel.conversation_id == ConversationModel.id)
        .filter(
            ConversationModel.user_id == user.id,
            MessageModel.role == "user",
        )
        .count()
    )

    # Documents and chunks from the BM25 corpus (fast in-memory read)
    documents_indexed, chunks_indexed = bm25.stats()

    return MetricsResponse(
        documents_indexed=documents_indexed,
        conversations_count=conversations_count,
        questions_asked=questions_asked,
        chunks_indexed=chunks_indexed,
    )
