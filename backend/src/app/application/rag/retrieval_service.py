from app.application.rag.embedding_service import EmbeddingService
from app.infrastructure.vector_store.qdrant_service import QdrantService


class RetrievalService:

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.qdrant = QdrantService()

    def retrieve(
        self,
        query: str,
        limit: int = 3,
    ):

        query_embedding = self.embedding_service.embed(query)

        results = self.qdrant.search(
            query_embedding=query_embedding,
            limit=limit,
        )

        return results

    def build_context(self, query: str) -> str:

        results = self.retrieve(query, limit=3)

        context_parts = []

        for result in results:
            context_parts.append(result.payload["text"])

        return "\n\n".join(context_parts)