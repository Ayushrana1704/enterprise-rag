import logging

from app.application.rag.embedding_service import EmbeddingService
from app.infrastructure.vector_store.qdrant_service import QdrantService

logger = logging.getLogger(__name__)


class RetrievalService:

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.qdrant = QdrantService()

    def retrieve(
        self,
        query: str,
        limit: int = 3,
    ):
        logger.info("Retrieving documents: query_length=%d, limit=%d", len(query), limit)

        query_embedding = self.embedding_service.embed(query)

        results = self.qdrant.search(
            query_embedding=query_embedding,
            limit=limit,
        )

        logger.info("Retrieved %d results", len(results))
        return results

    def retrieve_with_context(self, query: str, limit: int = 3):
        """Return (context_string, raw_results) so callers can access source metadata."""
        results = self.retrieve(query, limit=limit)
        context = "\n\n".join(r.payload["text"] for r in results)
        return context, results

    def build_context(self, query: str) -> str:
        context, _ = self.retrieve_with_context(query)
        return context
