import logging

from app.application.exceptions import EmbeddingError
from app.application.rag.model_registry import get_embedding_model
from app.infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self) -> None:
        settings = get_settings()
        self.model = get_embedding_model(settings.embedding_model_name)

    def embed(self, text: str) -> list[float]:
        logger.debug("Embedding single text (%d chars)", len(text))
        try:
            embedding = self.model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            logger.error("Failed to embed text (%d chars): %s", len(text), e)
            raise EmbeddingError("Failed to generate text embedding") from e

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        logger.info("Generating embeddings for %d document chunks", len(texts))
        try:
            embeddings = self.model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()
        except Exception as e:
            logger.error("Failed to embed %d document chunks: %s", len(texts), e)
            raise EmbeddingError("Failed to generate document embeddings") from e
