from fastapi import APIRouter
from pydantic import BaseModel

from app.application.rag.rag_service import RAGService
from app.application.rag.retrieval_service import RetrievalService

router = APIRouter(tags=["RAG"])

retrieval_service = RetrievalService()
rag_service = RAGService()


class ChatRequest(BaseModel):
    question: str


@router.get("/search")
def search(query: str):
    results = retrieval_service.retrieve(query)

    return [
        {
            "score": result.score,
            "filename": result.payload["filename"],
            "text": result.payload["text"],
        }
        for result in results
    ]


@router.post("/chat")
def chat(request: ChatRequest):
    return rag_service.ask(request.question)