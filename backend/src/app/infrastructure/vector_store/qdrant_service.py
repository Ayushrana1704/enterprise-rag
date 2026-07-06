import logging
from uuid import uuid4

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    PointStruct,
    ScoredPoint,
    VectorParams,
)

from app.application.exceptions import VectorStoreError
from app.application.rag.model_registry import get_vector_dimension
from app.infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)


class QdrantService:
    def __init__(self) -> None:
        settings = get_settings()

        self.client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
        )

        self.collection_name: str = settings.qdrant_collection_name
        self.vector_size: int = get_vector_dimension(settings.embedding_model_name)

    def create_collection(self) -> None:
        try:
            collections = self.client.get_collections().collections
            names = [c.name for c in collections]

            if self.collection_name in names:
                logger.info("Qdrant collection '%s' already exists", self.collection_name)
                return

            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.vector_size,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(
                "Qdrant collection '%s' created (dim=%d, metric=cosine)",
                self.collection_name,
                self.vector_size,
            )
        except Exception as e:
            logger.error("Failed to create Qdrant collection '%s': %s", self.collection_name, e)
            raise VectorStoreError(f"Failed to initialize collection '{self.collection_name}'") from e

    def store_embeddings(
        self,
        embeddings: list[list[float]],
        chunks: list[str],
        filename: str,
    ) -> None:
        logger.info("Storing %d embeddings for '%s'", len(chunks), filename)

        points = [
            PointStruct(
                id=str(uuid4()),
                vector=embedding,
                payload={
                    "filename": filename,
                    "text": chunk,
                },
            )
            for embedding, chunk in zip(embeddings, chunks)
        ]

        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
            )
        except Exception as e:
            logger.error("Failed to store embeddings for '%s': %s", filename, e)
            raise VectorStoreError(f"Failed to store embeddings for '{filename}'") from e

        logger.info("Stored %d points for '%s'", len(points), filename)

    def search(
        self,
        query_embedding: list[float],
        limit: int = 5,
    ) -> list[ScoredPoint]:
        logger.info("Searching collection '%s' (limit=%d)", self.collection_name, limit)

        try:
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                limit=limit,
            )
        except Exception as e:
            logger.error("Qdrant search failed in collection '%s': %s", self.collection_name, e)
            raise VectorStoreError("Vector search failed") from e

        logger.info("Search returned %d results", len(results.points))
        return results.points
