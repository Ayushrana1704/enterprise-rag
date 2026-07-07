import logging
from uuid import uuid4

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
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
        """Ensure the collection and all required payload indexes exist.

        Safe to call on every startup -- all operations are idempotent:
          - create_collection is skipped if the collection already exists.
          - create_payload_index is a no-op if the index already exists.

        Qdrant Cloud (unlike local Qdrant) requires an explicit payload index
        for every field used in a filter.  Without the user_id index, filtered
        searches raise:
          "Index required but not found for 'user_id'"
        """
        try:
            collections = self.client.get_collections().collections
            names = [c.name for c in collections]

            if self.collection_name not in names:
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
            else:
                logger.info("Qdrant collection '%s' already exists", self.collection_name)

        except Exception as e:
            logger.error("Failed to create Qdrant collection '%s': %s", self.collection_name, e)
            raise VectorStoreError(f"Failed to initialize collection '{self.collection_name}'") from e

        # Ensure payload indexes for every field used in a filter.
        # Qdrant Cloud requires explicit indexes; local Qdrant does not.
        # Both calls are idempotent — safe to call on every startup.
        for field in ("user_id", "document_id"):
            try:
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field,
                    field_schema=PayloadSchemaType.KEYWORD,
                )
                logger.info(
                    "Payload index on '%s' (keyword) ensured for collection '%s'",
                    field, self.collection_name,
                )
            except Exception as e:
                logger.error(
                    "Failed to create payload index on '%s' for collection '%s': %s",
                    field, self.collection_name, e,
                )
                raise VectorStoreError(
                    f"Failed to create payload index on '{field}' for '{self.collection_name}'"
                ) from e

    def store_embeddings(
        self,
        embeddings: list[list[float]],
        chunks: list[str],
        filename: str,
        document_id: str,
        user_id: str | None = None,
    ) -> None:
        """Upsert chunk embeddings into the collection.

        Each point payload includes ``filename``, ``document_id``, and ``text``.
        ``document_id`` is a UUID generated at upload time that uniquely
        identifies this document.  It is stored on every chunk so vectors can
        later be filtered or grouped by document (Phase 2+).

        When ``user_id`` is provided (authenticated upload), it is stored in
        the payload so retrieval can be scoped to that user later.
        Anonymous uploads (``user_id=None``) omit the field entirely, which
        means they will only surface in unfiltered (anonymous) searches.
        """
        logger.info(
            "Storing %d embeddings for '%s' (document_id=%s, user_id=%s)",
            len(chunks), filename, document_id, user_id or "anonymous",
        )

        points = [
            PointStruct(
                id=str(uuid4()),
                vector=embedding,
                payload={
                    "filename": filename,
                    "document_id": document_id,
                    "text": chunk,
                    # 1-based position within this file -- used for citation display.
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
        document_id: str | None = None,
    ) -> list[ScoredPoint]:
        """Search the collection for nearest neighbours.

        Filter logic:
          user_id=None, document_id=None  → global search (backward compat)
          user_id="x",  document_id=None  → filter by user only
          user_id="x",  document_id="y"   → filter by user AND document

        All filter conditions run inside Qdrant's ANN index — no over-fetching.
        """
        query_filter: Filter | None = None
        must = []
        if user_id is not None:
            must.append(FieldCondition(key="user_id", match=MatchValue(value=user_id)))
        if document_id is not None:
            must.append(FieldCondition(key="document_id", match=MatchValue(value=document_id)))
        if must:
            query_filter = Filter(must=must)

        log_scope = f"user_id={user_id}" if user_id else "anonymous"
        if document_id:
            log_scope += f" doc={document_id}"
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
