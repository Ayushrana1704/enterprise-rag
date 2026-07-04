import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent / "src"))

from app.application.rag.embedding_service import EmbeddingService
from app.infrastructure.vector_store.qdrant_service import QdrantService

embedding_service = EmbeddingService()
qdrant_service = QdrantService()

query = "What is Retrieval Augmented Generation?"

query_embedding = embedding_service.embed(query)

results = qdrant_service.search(query_embedding)

print(f"Found {len(results)} results\n")

for i, result in enumerate(results, start=1):
    print("=" * 80)
    print(f"Result {i}")
    print(f"Score: {result.score:.4f}")
    print(f"Filename: {result.payload['filename']}")
    print(f"Text:\n{result.payload['text']}")
    print()