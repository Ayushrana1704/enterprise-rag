import logging
from uuid import uuid4

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
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

        # When QDRANT_API_KEY is set, connect over HTTPS to Qdrant Cloud.
        # When it is empty (the default), connect without auth to a local instance.
        # No other code changes are required to switch between environments.
        api_key = settings.qdrant_api_key.strip()
        self.client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
            **({"api_key": api_key, "https": True} if api_key else {}),
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
        user_id: str | None = None,
    ) -> None:
        """Upsert chunk embeddings into the collection.

        Each point payload includes ``filename`` and ``text``.
        When ``user_id`` is provided (authenticated upload), it is stored in
        the payload so retrieval can be scoped to that user later.
        Anonymous uploads (``user_id=None``) omit the field entirely, which
        means they will only surface in unfiltered (anonymous) searches.
        """
        logger.info(
            "Storing %d embeddings for '%s' (user_id=%s)",
            len(chunks), filename, user_id or "anonymous",
        )

        points = [
            PointStruct(
                id=str(uuid4()),
                vector=embedding,
                payload={
                    "filename": filename,
                    "text": chunk,
                    # 1-based position within this file — used for citation display.
                    "chunk_index": chunk_idx,
                    **({"user_id": user_id} if user_id is not None else {}),
                },
            )
            for chunk_idx, (embedding, chunk) in enumerate(
                zip(embeddings, chunks), start=1
            )
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
        user_id: str | None = None,
    ) -> list[ScoredPoint]:
        """Search the collection for nearest neighbours.

        When ``user_id`` is provided, applies a native Qdrant payload filter
        so only points owned by that user are considered.  This runs inside
        Qdrant's ANN index — no post-retrieval filtering, no over-fetching.

        When ``user_id`` is None (anonymous request), the search is global and
        returns results from the full collection, preserving backward compat.
        """
        query_filter: Filter | None = None
        if user_id is not None:
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="user_id",
                        match=MatchValue(value=user_id),
                    )
                ]
            )

        log_scope = f"user_id={user_id}" if user_id else "anonymous"
        logger.info(
            "Searching collection '%s' (limit=%d, scope=%s)",
            self.collection_name, limit, log_scope,
        )

        try:
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                limit=limit,
                query_filter=query_filter,
            )
        except Exception as e:
            logger.error("Qdrant search failed in collection '%s': %s", self.collection_name, e)
            raise VectorStoreError("Vector search failed") from e

        logger.info("Search returned %d results", len(results.points))
        return results.points
