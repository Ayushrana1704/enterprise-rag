"""Hybrid retrieval service — dense (Qdrant) + sparse (BM25) + RRF fusion.

Public interface (unchanged from Phase 5.5B):
  retrieve(query, limit, user_id)  → list[RetrievalResult]
  retrieve_with_context(...)       → (context_str, list[RetrievalResult])
  build_context(...)               → context_str

``RetrievalResult`` is duck-type compatible with qdrant_client.ScoredPoint
(callers access only ``.score`` and ``.payload[key]``), so RAGService and
the route layer require zero changes.

Feature toggle
--------------
When ``HYBRID_SEARCH_ENABLED=false`` the service skips BM25 and RRF entirely,
running only the dense Qdrant search.  The return type and payload structure
are identical in both modes — no upstream code sees the difference.

Configuration
-------------
All tuneable constants come from ``Settings`` and are read once on service
construction (singleton lifetime).  Override via environment variables:

  HYBRID_SEARCH_ENABLED   bool   default True
  RRF_K                   int    default 60
  HYBRID_OVERSAMPLE_FACTOR int   default 2
  DENSE_WEIGHT            float  default 1.0  (reserved, not yet applied)
  SPARSE_WEIGHT           float  default 1.0  (reserved, not yet applied)
"""

import logging
from dataclasses import dataclass

from app.application.rag.embedding_service import EmbeddingService
from app.infrastructure.bm25.bm25_service import BM25Result, BM25Service
from app.infrastructure.config.settings import get_settings
from app.infrastructure.vector_store.qdrant_service import QdrantService, ScoredPoint

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Unified result type
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RetrievalResult:
    """Fused retrieval result.

    Duck-type compatible with qdrant_client.ScoredPoint: callers access only
    ``.score`` and ``.payload[key]`` — no upstream change is required.

    payload keys
    ------------
    ``filename``    — source document name (always present)
    ``text``        — chunk text (always present)
    ``chunk_index`` — one-based position within the file, or None for
                      BM25-only hits where no Qdrant point was matched.
    """
    score: float
    payload: dict


# ---------------------------------------------------------------------------
# RRF fusion
# ---------------------------------------------------------------------------

def _rrf_fuse(
    dense: list[ScoredPoint],
    sparse: list[BM25Result],
    k: int,
    limit: int,
) -> list[RetrievalResult]:
    """Merge two ranked lists via Reciprocal Rank Fusion.

    Algorithm
    ---------
    For each retriever r and each result at 1-based rank i:
        fused_score[chunk_text] += 1 / (k + i)

    Chunks that appear in both lists accumulate contributions from both ranks,
    naturally elevating results that both retrievers agree on.

    Deduplication key: exact chunk text.  Both Qdrant and BM25 are indexed
    from the identical splitter output, so identical text ↔ identical chunk.
    When a chunk appears in both sources, the Qdrant payload wins (it carries
    ``chunk_index``); the BM25 result contributes only to the score.

    Weighted RRF
    ------------
    ``DENSE_WEIGHT`` and ``SPARSE_WEIGHT`` from Settings are stored on
    RetrievalService but not yet applied here.  To enable them, change the
    accumulation lines to:
        fused_score[text] += weight * (1.0 / (k + rank))
    """
    rrf_scores: dict[str, float] = {}
    payloads: dict[str, dict] = {}

    for rank, result in enumerate(dense, start=1):
        text: str = result.payload["text"]
        rrf_scores[text] = rrf_scores.get(text, 0.0) + 1.0 / (k + rank)
        if text not in payloads:
            payloads[text] = {
                "filename": result.payload["filename"],
                "text": text,
                "chunk_index": result.payload.get("chunk_index"),
            }

    for rank, result in enumerate(sparse, start=1):
        text = result.text
        rrf_scores[text] = rrf_scores.get(text, 0.0) + 1.0 / (k + rank)
        if text not in payloads:
            payloads[text] = {
                "filename": result.filename,
                "text": text,
                "chunk_index": None,
            }

    ranked = sorted(rrf_scores.items(), key=lambda kv: kv[1], reverse=True)
    return [
        RetrievalResult(score=score, payload=payloads[text])
        for text, score in ranked[:limit]
    ]


def _wrap_dense(
    dense: list[ScoredPoint],
    limit: int,
) -> list[RetrievalResult]:
    """Wrap Qdrant ScoredPoints as RetrievalResults for the dense-only path.

    Preserves the return type contract so the feature toggle is invisible
    to callers.
    """
    return [
        RetrievalResult(
            score=r.score,
            payload={
                "filename": r.payload["filename"],
                "text": r.payload["text"],
                "chunk_index": r.payload.get("chunk_index"),
            },
        )
        for r in dense[:limit]
    ]


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class RetrievalService:
    """Hybrid retrieval: dense + sparse search fused with RRF.

    All tuneable constants are read from Settings on construction so they
    can be changed via environment variables without code changes.
    ``BM25Service`` is injected, matching the singleton-factory pattern used
    for EmbeddingService and QdrantService.
    """

    def __init__(self, bm25_service: BM25Service) -> None:
        settings = get_settings()

        self.embedding_service = EmbeddingService()
        self.qdrant = QdrantService()
        self.bm25 = bm25_service

        # --- configuration snapshot (read once per process) ---
        self._hybrid_enabled: bool = settings.hybrid_search_enabled
        self._rrf_k: int = settings.rrf_k
        self._oversample: int = settings.hybrid_oversample_factor
        # Weights reserved for weighted RRF (Phase 5.5D+); stored but unused.
        self._dense_weight: float = settings.dense_weight
        self._sparse_weight: float = settings.sparse_weight

        logger.info(
            "RetrievalService ready: hybrid=%s, rrf_k=%d, oversample=%d, "
            "dense_weight=%.2f, sparse_weight=%.2f",
            self._hybrid_enabled, self._rrf_k, self._oversample,
            self._dense_weight, self._sparse_weight,
        )

    def retrieve(
        self,
        query: str,
        limit: int = 3,
        user_id: str | None = None,
        document_id: str | None = None,
    ) -> list[RetrievalResult]:
        """Run retrieval and return a ranked list of results.

        Hybrid mode  (``HYBRID_SEARCH_ENABLED=true``):
            Dense + BM25 → RRF fusion → top-limit results.
        Dense-only mode (``HYBRID_SEARCH_ENABLED=false``):
            Dense Qdrant search only; BM25 is never called.
        """
        query_embedding = self.embedding_service.embed(query)

        if not self._hybrid_enabled:
            dense_results: list[ScoredPoint] = self.qdrant.search(
                query_embedding=query_embedding,
                limit=limit,
                user_id=user_id,
                document_id=document_id,
            )
            fused = _wrap_dense(dense_results, limit)
            logger.info(
                "Retrieval (dense-only): query_len=%d user=%s doc=%s "
                "dense=%d final=%d",
                len(query), user_id or "anon", document_id or "all",
                len(dense_results), len(fused),
            )
            return fused

        # Hybrid path — overfetch from both retrievers
        fetch = limit * self._oversample

        dense_results = self.qdrant.search(
            query_embedding=query_embedding,
            limit=fetch,
            user_id=user_id,
            document_id=document_id,
        )
        sparse_results: list[BM25Result] = self.bm25.search(
            query=query,
            limit=fetch,
            user_id=user_id,
            document_id=document_id,
        )

        # Overlap stats (cheap set ops; used only for logging)
        dense_texts = {r.payload["text"] for r in dense_results}
        sparse_texts = {r.text for r in sparse_results}
        duplicate_count = len(dense_texts & sparse_texts)
        merged_count = len(dense_texts | sparse_texts)

        fused = _rrf_fuse(
            dense=dense_results,
            sparse=sparse_results,
            k=self._rrf_k,
            limit=limit,
        )

        logger.info(
            "Retrieval (hybrid): query_len=%d user=%s doc=%s "
            "dense=%d sparse=%d merged=%d duplicates=%d final=%d",
            len(query), user_id or "anon", document_id or "all",
            len(dense_results), len(sparse_results),
            merged_count, duplicate_count, len(fused),
        )
        return fused

    def retrieve_with_context(
        self,
        query: str,
        limit: int = 3,
        user_id: str | None = None,
        document_id: str | None = None,
    ) -> tuple[str, list[RetrievalResult]]:
        """Return (context_string, raw_results) for callers that need source metadata."""
        results = self.retrieve(query, limit=limit, user_id=user_id, document_id=document_id)
        context = "\n\n".join(r.payload["text"] for r in results)
        return context, results

    def build_context(
        self,
        query: str,
        user_id: str | None = None,
        document_id: str | None = None,
    ) -> str:
        context, _ = self.retrieve_with_context(query, user_id=user_id, document_id=document_id)
        return context
