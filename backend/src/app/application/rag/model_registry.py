"""Central registry for AI model loading and caching.

Design
------
A single ``_registry`` dict acts as the backing cache for all model types.
Keys are namespaced by model type (e.g. ``"embedding:BAAI/bge-m3"``) so
embedding models, LLMs, rerankers, etc. can coexist without key collisions.

Each model type is exposed through its own typed accessor function.
Adding a new model type means adding one new accessor -- nothing else changes.
"""

import logging
from typing import Any

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Generic model cache.  Keys are namespaced: "<type>:<model_name>".
_registry: dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Embedding models
# ---------------------------------------------------------------------------

def get_embedding_model(model_name: str) -> SentenceTransformer:
    """Return a cached SentenceTransformer for *model_name*.

    The model is loaded on first access and reused on every subsequent call.
    """
    key = f"embedding:{model_name}"

    if key not in _registry:
        logger.info("Loading embedding model '%s'...", model_name)
        _registry[key] = SentenceTransformer(model_name)
        logger.info("Embedding model '%s' ready.", model_name)

    return _registry[key]


# ---------------------------------------------------------------------------
# Embedding model metadata
# ---------------------------------------------------------------------------
# Maps each supported model name to its output vector dimension.
# This is the single place to register a new embedding model.
# QdrantService reads from here so the collection is always created
# with the correct dimension for the configured model.
#
# Registered models:
#   BAAI/bge-m3          1024-dim  ~1.5 GB RAM  best quality (local dev default)
#   all-MiniLM-L6-v2      384-dim  ~90 MB RAM   lightweight (Render free tier)
# ---------------------------------------------------------------------------

_EMBEDDING_VECTOR_DIMENSIONS: dict[str, int] = {
    "BAAI/bge-m3": 1024,
    "all-MiniLM-L6-v2": 384,
}


def get_vector_dimension(model_name: str) -> int:
    """Return the output vector dimension for a registered embedding model.

    Raises ValueError if the model is not in the registry, preventing a
    silent mismatch between the Qdrant collection dimension and the actual
    model output at query time.
    """
    dimension = _EMBEDDING_VECTOR_DIMENSIONS.get(model_name)
    if dimension is None:
        supported = ", ".join(_EMBEDDING_VECTOR_DIMENSIONS)
        raise ValueError(
            f"Embedding model {model_name!r} is not registered. "
            f"Add it to _EMBEDDING_VECTOR_DIMENSIONS in model_registry.py. "
            f"Currently supported: {supported}"
        )
    return dimension
