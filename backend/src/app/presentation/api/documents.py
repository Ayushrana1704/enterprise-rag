from pathlib import Path

import fitz
from fastapi import APIRouter, File, HTTPException, UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.application.rag.embedding_service import EmbeddingService
from app.infrastructure.vector_store.qdrant_service import QdrantService

router = APIRouter(tags=["Documents"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
embedding_service = EmbeddingService()
qdrant_service = QdrantService()
qdrant_service.create_collection()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    document = fitz.open(file_path)

    text = ""
    for page in document:
        text += page.get_text()

    page_count = document.page_count
    document.close()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
    )

    chunks = text_splitter.split_text(text)
    embeddings = embedding_service.embed_documents(chunks)
    qdrant_service.store_embeddings(
        embeddings=embeddings,
        chunks=chunks,
        filename=file.filename,
    )

    return {
        "filename": file.filename,
        "pages": page_count,
        "characters": len(text),
        "chunks": len(chunks),
        "first_chunk": chunks[0],
    }