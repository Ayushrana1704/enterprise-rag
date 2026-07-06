"""Application-level exception hierarchy.

Services in the application and infrastructure layers raise these exceptions.
The presentation layer (FastAPI exception handlers in main.py) converts them
into appropriate HTTP responses without exposing internal details.
"""


class RAGException(Exception):
    """Base class for all application exceptions."""


class DocumentProcessingError(RAGException):
    """Raised when a document cannot be read or processed."""


class EmbeddingError(RAGException):
    """Raised when the embedding model fails to encode text."""


class VectorStoreError(RAGException):
    """Raised when a Qdrant operation fails."""


class LLMError(RAGException):
    """Raised when the LLM service returns an error or is unreachable."""
