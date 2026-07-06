import logging
from pathlib import Path

import fitz
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.application.rag.embedding_service import EmbeddingService
from app.infrastructure.vector_store.qdrant_service import QdrantService
from app.presentation.api.dependencies import get_embedding_service, get_qdrant_service
from app.presentation.api.schemas import DocumentUploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Documents"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    qdrant_service: QdrantService = Depends(get_qdrant_service),
) -> DocumentUploadResponse:
    if file.content_type != "application/pdf":
        logger.warning(
            "Rejected upload '%s': content_type=%s", file.filename, file.content_type
        )
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    logger.info("Upload started: '%s'", file.filename)

    file_path = UPLOAD_DIR / file.filename

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
    except OSError as e:
        logger.error("Failed to save uploaded file '%s': %s", file.filename, e)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

    try:
        document = fitz.open(file_path)
        text = ""
        for page in document:
            text += page.get_text()
        page_count = document.page_count
        document.close()
    except Exception as e:
        logger.error("Failed to extract text from '%s': %s", file.filename, e)
        raise HTTPException(status_code=422, detail="Failed to process PDF document")

    logger.info(
        "Extracted text from '%s': %d pages, %d chars",
        file.filename,
        page_count,
        len(text),
    )

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
    )
    chunks = text_splitter.split_text(text)
    logger.info("Split '%s' into %d chunks, generating embeddings", file.filename, len(chunks))

    # EmbeddingError and VectorStoreError propagate to the global exception handlers.
    embeddings = embedding_service.embed_documents(chunks)
    qdrant_service.store_embeddings(
        embeddings=embeddings,
        chunks=chunks,
        filename=file.filename,
    )

    logger.info("Document '%s' indexed successfully", file.filename)

    return DocumentUploadResponse(
        filename=file.filename,
        pages=page_count,
        characters=len(text),
        chunks=len(chunks),
        first_chunk=chunks[0],
    )
