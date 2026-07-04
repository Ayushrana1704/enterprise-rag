import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent / "src"))

from app.infrastructure.vector_store.qdrant_service import QdrantService

service = QdrantService()
service.create_collection()

print("✅ Collection Ready")