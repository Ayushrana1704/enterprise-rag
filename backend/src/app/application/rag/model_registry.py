from sentence_transformers import SentenceTransformer

_embedding_model = None


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model

    if _embedding_model is None:
        print("Loading embedding model...")
        _embedding_model = SentenceTransformer("BAAI/bge-m3")
        print("Embedding model loaded.")

    return _embedding_model