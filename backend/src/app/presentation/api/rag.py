import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.application.chat.conversation_service import ConversationService
from app.application.exceptions import ConversationNotFoundError, LLMError
from app.application.rag.rag_service import RAGService
from app.application.rag.retrieval_service import RetrievalService
from app.domain.auth.user import User
from app.infrastructure.database.session import get_db
from app.infrastructure.repositories.conversation_repository import (
    ConversationRepository,
)
from app.presentation.api.auth import get_optional_user
from app.presentation.api.dependencies import get_rag_service, get_retrieval_service
from app.presentation.api.schemas import ChatResponse, CitationItem, SearchResultItem

logger = logging.getLogger(__name__)

router = APIRouter(tags=["RAG"])


# ---------------------------------------------------------------------------
# Request schema — conversation_id is optional for backward compatibility
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    question: str
    conversation_id: str | None = None


# ---------------------------------------------------------------------------
# Per-request dependency
# ---------------------------------------------------------------------------

def get_conversation_service(db=Depends(get_db)) -> ConversationService:
    """Per-request factory — same pattern as conversations.py."""
    return ConversationService(ConversationRepository(db))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/search", response_model=list[SearchResultItem])
def search(
    query: str,
    retrieval_service: RetrievalService = Depends(get_retrieval_service),
    user: User | None = Depends(get_optional_user),
) -> list[SearchResultItem]:
    results = retrieval_service.retrieve(query, user_id=user.id if user else None)
    return [
        SearchResultItem(
            score=result.score,
            filename=result.payload["filename"],
            text=result.payload["text"],
        )
        for result in results
    ]


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    rag_service: RAGService = Depends(get_rag_service),
    user: User | None = Depends(get_optional_user),
) -> ChatResponse:
    result = rag_service.ask(request.question, user_id=user.id if user else None)
    return ChatResponse(
        answer=result["answer"],
        context=result["context"],
        citations=[
            CitationItem(
                filename=s.payload["filename"],
                chunk_index=s.payload.get("chunk_index"),
                score=s.score,
                preview=s.payload["text"][:300],
            )
            for s in result["sources"]
        ],
    )


@router.post("/stream")
async def stream_chat(
    request: ChatRequest,
    rag_service: RAGService = Depends(get_rag_service),
    user: User | None = Depends(get_optional_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
) -> StreamingResponse:
    """Stream the RAG answer as Server-Sent Events.

    SSE protocol (unchanged):
      {"type": "citations", "citations": [...]}   — after retrieval, before generation
      {"type": "token", "delta": "..."}           — one per LLM token
      {"type": "done"}                            — clean completion
      {"type": "error", "message": "..."}         — LLM failure (replaces done)

    Authentication rules:
      - conversation_id omitted  → stateless mode; no token required; no persistence.
      - conversation_id provided → authentication REQUIRED; 401 if missing or invalid.

    Retrieval scoping:
      - Authenticated → search scoped to documents owned by this user.
      - Anonymous     → global search across all anonymous uploads.

    Persistence rules:
      - Only after a clean "done" event (never partial responses).
      - On LLM error, exception, or client disconnect: nothing is written.
    """
    # Gate: if the caller wants persistence they must be authenticated.
    if request.conversation_id is not None and user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to persist a conversation.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    persist = request.conversation_id is not None  # user guaranteed non-None here
    user_id = user.id if user else None

    async def generate():
        accumulated_text: list[str] = []
        accumulated_citations: list[dict] = []
        completed = False

        try:
            async for event in rag_service.ask_stream(request.question, user_id=user_id):
                yield f"data: {json.dumps(event)}\n\n"

                if event["type"] == "citations":
                    accumulated_citations = event.get("citations", [])
                elif event["type"] == "token":
                    accumulated_text.append(event.get("delta", ""))
                elif event["type"] == "done":
                    completed = True

        except LLMError as e:
            logger.error("LLM error during streaming: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        except Exception as e:
            logger.error("Unexpected error during streaming: %s", e, exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': 'Internal server error'})}\n\n"

        if completed and persist:
            try:
                conversation_service.append_message(
                    conversation_id=request.conversation_id,
                    user_id=user.id,
                    role="user",
                    content=request.question,
                    citations=[],
                )
                conversation_service.append_message(
                    conversation_id=request.conversation_id,
                    user_id=user.id,
                    role="assistant",
                    content="".join(accumulated_text),
                    citations=accumulated_citations,
                )
                logger.debug(
                    "Persisted turn for conversation %s", request.conversation_id
                )
            except ConversationNotFoundError:
                logger.warning(
                    "conversation_id %s not found or not owned by user %s; "
                    "messages not persisted.",
                    request.conversation_id, user.id,
                )
            except Exception as e:
                logger.error(
                    "Failed to persist conversation %s: %s",
                    request.conversation_id, e,
                )

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
