"""FastAPI dependency providers for application services.

Every provider is decorated with @lru_cache so the service is instantiated
once per process and reused across requests (singleton lifetime).
Add new providers here when new services need to be injected into routes.
"""

from functools import lru_cache

from pathlib import Path

from app.application.rag.embedding_service import EmbeddingService
from app.infrastructure.bm25.bm25_service import BM25Service
from app.infrastructure.config.settings import get_settings
from app.application.rag.rag_service import RAGService
from app.application.rag.retrieval_service import RetrievalService
from app.infrastructure.vector_store.qdrant_service import QdrantService


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()


@lru_cache
def get_qdrant_service() -> QdrantService:
    return QdrantService()


@lru_cache
def get_retrieval_service() -> RetrievalService:
    return RetrievalService(bm25_service=get_bm25_service())


@lru_cache
def get_rag_service() -> RAGService:
    return RAGService(retrieval_service=get_retrieval_service())


@lru_cache
def get_bm25_service() -> BM25Service:
    settings = get_settings()
    return BM25Service(corpus_path=Path(settings.bm25_corpus_path))
