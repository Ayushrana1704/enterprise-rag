from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.application.rag.rag_service import RAGService
from app.application.rag.retrieval_service import RetrievalService
from app.presentation.api.dependencies import get_rag_service, get_retrieval_service
from app.presentation.api.schemas import ChatResponse, CitationItem, SearchResultItem

router = APIRouter(tags=["RAG"])


class ChatRequest(BaseModel):
    question: str


@router.get("/search", response_model=list[SearchResultItem])
def search(
    query: str,
    retrieval_service: RetrievalService = Depends(get_retrieval_service),
) -> list[SearchResultItem]:
    results = retrieval_service.retrieve(query)
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
) -> ChatResponse:
    result = rag_service.ask(request.question)
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
