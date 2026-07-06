"""BM25 indexing service.

Wraps ``rank_bm25.BM25Okapi`` with:
  - structured per-document metadata (filename, user_id)
  - corpus persistence to a JSON file so the index survives restarts
  - thread-safe mutations for concurrent upload requests
  - optional per-user scoping that mirrors the Qdrant payload filter

This service is intentionally isolated from the dense retrieval path.
It has no dependency on QdrantService or EmbeddingService.
The fusion layer (Phase 5.5B) will combine results from both services.
"""

import json
import logging
import re
import threading
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
from rank_bm25 import BM25Okapi

from app.application.exceptions import BM25IndexError

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal document model
# ---------------------------------------------------------------------------

@dataclass
class BM25Document:
    """A single indexed chunk with its source metadata."""
    text: str
    filename: str
    user_id: str | None


# ---------------------------------------------------------------------------
# Result model — structured for future fusion compatibility
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BM25Result:
    """A retrieved chunk with its BM25 relevance score.

    Field layout mirrors the ``payload`` dict on Qdrant's ``ScoredPoint``
    so the upcoming fusion layer can work with a uniform interface across
    both retrieval strategies.
    """
    text: str
    filename: str
    user_id: str | None
    score: float


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> list[str]:
    """Lowercase and split on non-alphanumeric characters.

    Intentionally simple for PR 13A.  The tokenizer is the single place to
    improve (stemming, stopword removal) without changing any callers.
    """
    return re.findall(r"\w+", text.lower())


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class BM25Service:
    """Thread-safe BM25 index with JSON-backed corpus persistence.

    Lifecycle
    ---------
    On construction the service loads any previously persisted corpus from
    ``corpus_path`` and rebuilds the in-memory index.  This means the index
    is ready immediately after the FastAPI app starts — no warm-up request
    required.

    On ``add_documents`` the corpus is extended, the index is rebuilt, and
    the corpus is flushed to disk atomically (write to a tmp file, then rename).

    Scoping
    -------
    ``search(user_id=None)``  → uses the pre-built global index (all docs).
    ``search(user_id="x")``   → builds a temporary per-query index scoped to
                                 that user's documents; correct BM25 statistics
                                 are computed on the filtered sub-corpus, which
                                 mirrors Qdrant's pre-retrieval payload filter.

    Concurrency
    -----------
    A single ``threading.Lock`` guards all mutations.  Read-heavy workloads
    can be improved with a read-write lock in a future phase; for now
    simplicity is preferred over micro-optimisation.
    """

    def __init__(self, corpus_path: Path) -> None:
        self._corpus_path = corpus_path
        self._lock = threading.Lock()
        self._corpus: list[BM25Document] = []
        self._bm25: BM25Okapi | None = None   # global index; None when corpus is empty

        self._load()
        logger.info(
            "BM25Service ready: corpus=%d docs, path=%s",
            len(self._corpus), self._corpus_path,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_documents(
        self,
        chunks: list[str],
        filename: str,
        user_id: str | None = None,
    ) -> None:
        """Append ``chunks`` to the index and persist the updated corpus.

        Called once per upload.  Each chunk becomes an independent BM25
        document, exactly mirroring the per-chunk embedding stored in Qdrant.
        """
        if not chunks:
            return

        with self._lock:
            for chunk in chunks:
                self._corpus.append(
                    BM25Document(text=chunk, filename=filename, user_id=user_id)
                )
            self._rebuild_index()
            self._persist()

        logger.info(
            "BM25: indexed %d chunks from '%s' (user_id=%s, corpus total=%d)",
            len(chunks), filename, user_id or "anonymous", len(self._corpus),
        )

    def stats(self) -> tuple[int, int]:
        """Return (unique_documents, total_chunks) from the in-memory corpus.

        Thread-safe read — acquires the lock briefly.
        Used by the /metrics endpoint; does not touch disk or the index.
        """
        with self._lock:
            total_chunks = len(self._corpus)
            unique_docs = len({d.filename for d in self._corpus})
        return unique_docs, total_chunks

    def search(
        self,
        query: str,
        limit: int = 5,
        user_id: str | None = None,
    ) -> list[BM25Result]:
        """Return the top-``limit`` chunks ranked by BM25Okapi score.

        When ``user_id`` is provided the search is scoped to that user's
        documents.  A temporary sub-corpus index is built for the query so
        IDF statistics reflect only the relevant document set — the same
        semantic guarantee as Qdrant's pre-filter.

        When ``user_id`` is None (anonymous) the global index is used,
        preserving the pre-isolation behaviour.
        """
        with self._lock:
            if user_id is not None:
                return self._search_filtered(query, limit, user_id)
            return self._search_global(query, limit)

    # ------------------------------------------------------------------
    # Private helpers — all called while _lock is held
    # ------------------------------------------------------------------

    def _search_global(self, query: str, limit: int) -> list[BM25Result]:
        """Search the full corpus index."""
        if self._bm25 is None or not self._corpus:
            return []

        tokens = _tokenize(query)
        scores: np.ndarray = self._bm25.get_scores(tokens)
        return self._top_results(self._corpus, scores, limit)

    def _search_filtered(
        self,
        query: str,
        limit: int,
        user_id: str,
    ) -> list[BM25Result]:
        """Build a temporary sub-corpus index scoped to ``user_id`` and search it."""
        filtered = [d for d in self._corpus if d.user_id == user_id]
        if not filtered:
            return []

        tokenized = [_tokenize(d.text) for d in filtered]
        bm25 = BM25Okapi(tokenized)
        scores: np.ndarray = bm25.get_scores(_tokenize(query))
        return self._top_results(filtered, scores, limit)

    @staticmethod
    def _top_results(
        docs: list[BM25Document],
        scores: np.ndarray,
        limit: int,
    ) -> list[BM25Result]:
        """Return the top-``limit`` docs sorted descending by score, score > 0."""
        ranked = sorted(
            ((float(scores[i]), docs[i]) for i in range(len(docs)) if scores[i] > 0),
            key=lambda x: x[0],
            reverse=True,
        )
        return [
            BM25Result(
                text=doc.text,
                filename=doc.filename,
                user_id=doc.user_id,
                score=score,
            )
            for score, doc in ranked[:limit]
        ]

    def _rebuild_index(self) -> None:
        """Rebuild the global BM25 index from the current corpus.

        O(N) operation.  Called after every ``add_documents``.
        For write-heavy workloads this can be replaced with batch indexing.
        """
        if not self._corpus:
            self._bm25 = None
            return
        tokenized = [_tokenize(d.text) for d in self._corpus]
        self._bm25 = BM25Okapi(tokenized)
        logger.debug("BM25: index rebuilt (%d documents)", len(self._corpus))

    def _persist(self) -> None:
        """Atomically flush the corpus to disk as JSON.

        Write to a sibling tmp file then rename so a crash mid-write never
        leaves a corrupt corpus file.
        """
        tmp_path = self._corpus_path.with_suffix(".tmp")
        try:
            data = [asdict(d) for d in self._corpus]
            tmp_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            tmp_path.replace(self._corpus_path)
        except OSError as e:
            logger.error("BM25: failed to persist corpus to '%s': %s", self._corpus_path, e)
            raise BM25IndexError(f"Failed to persist BM25 corpus: {e}") from e

    def _load(self) -> None:
        """Load a previously persisted corpus and rebuild the index.

        Missing file is treated as an empty corpus (first startup or clean env).
        """
        if not self._corpus_path.exists():
            logger.info("BM25: no corpus file at '%s'; starting empty", self._corpus_path)
            return
        try:
            data = json.loads(self._corpus_path.read_text(encoding="utf-8"))
            self._corpus = [BM25Document(**entry) for entry in data]
            self._rebuild_index()
            logger.info(
                "BM25: loaded %d documents from '%s'",
                len(self._corpus), self._corpus_path,
            )
        except (OSError, json.JSONDecodeError, TypeError) as e:
            logger.error(
                "BM25: failed to load corpus from '%s': %s — starting empty",
                self._corpus_path, e,
            )
            self._corpus = []
            self._bm25 = None
