import logging
from pathlib import Path
from uuid import uuid4

import fitz
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session

from app.application.rag.embedding_service import EmbeddingService
from app.domain.auth.user import User
from app.infrastructure.bm25.bm25_service import BM25Service
from app.infrastructure.database.session import get_db
from app.infrastructure.models.document import DocumentModel
from app.infrastructure.vector_store.qdrant_service import QdrantService
from app.presentation.api.auth import get_optional_user
from app.presentation.api.dependencies import (
    get_bm25_service,
    get_embedding_service,
    get_qdrant_service,
)
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
    bm25_service: BM25Service = Depends(get_bm25_service),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> DocumentUploadResponse:
    """Index a PDF into both the vector store and the BM25 index.

    Dense (Qdrant) and sparse (BM25) indexing are performed on the same
    chunk list so both indexes always stay in sync.

    A UUID document_id is generated for every upload and stored in:
      - Every Qdrant point payload (enables per-document filtering in Phase 2+)
      - The documents table in PostgreSQL (persistent document registry)

    When the caller is authenticated, ``user_id`` is stored in both indexes
    so retrieval can be scoped per user.  Unauthenticated uploads are stored
    without a ``user_id`` and are only visible to global (unfiltered) searches
    -- preserving full backward compatibility.

    BM25 indexing is non-critical: if it fails the upload still succeeds and
    the dense index remains the authoritative retrieval path.  An error is
    logged so the operator can investigate.
    """
    if file.content_type != "application/pdf":
        logger.warning(
            "Rejected upload '%s': content_type=%s", file.filename, file.content_type
        )
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    user_id = user.id if user else None
    document_id = str(uuid4())
    logger.info(
        "Upload started: '%s' (document_id=%s, user_id=%s)",
        file.filename,
        document_id,
        user_id or "anonymous",
    )

    # Strip any directory components from the client-supplied filename to
    # prevent path traversal attacks (e.g. "../../etc/passwd.pdf").
    safe_filename = Path(file.filename).name if file.filename else "upload.pdf"
    file_path = UPLOAD_DIR / safe_filename

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
    except OSError as e:
        logger.error("Failed to save uploaded file '%s': %s", safe_filename, e)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

    try:
        document = fitz.open(file_path)
        text = ""
        for page in document:
            text += page.get_text()
        page_count = document.page_count
        document.close()
    except Exception as e:
        logger.error("Failed to extract text from '%s': %s", safe_filename, e)
        raise HTTPException(status_code=422, detail="Failed to process PDF document")

    logger.info(
        "Extracted text from '%s': %d pages, %d chars",
        safe_filename,
        page_count,
        len(text),
    )

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
    )
    chunks = text_splitter.split_text(text)
    logger.info("Split '%s' into %d chunks, generating embeddings", safe_filename, len(chunks))

    # -- Dense indexing (Qdrant) -----------------------------------------------
    # EmbeddingError and VectorStoreError propagate to the global exception
    # handlers -- a failure here aborts the upload.
    embeddings = embedding_service.embed_documents(chunks)
    qdrant_service.store_embeddings(
        embeddings=embeddings,
        chunks=chunks,
        filename=safe_filename,
        document_id=document_id,
        user_id=user_id,
    )

    # -- Sparse indexing (BM25) ------------------------------------------------
    # Non-critical: a BM25 failure must not abort a successful dense upload.
    try:
        bm25_service.add_documents(
            chunks=chunks,
            filename=safe_filename,
            user_id=user_id,
        )
    except Exception as e:
        logger.warning(
            "BM25 indexing failed for '%s' (non-fatal): %s", safe_filename, e
        )

    # -- Persist document metadata to PostgreSQL --------------------------------
    # Non-critical: a DB failure must not abort a successful vector store upload.
    # The Qdrant vectors are the authoritative store; the DB row is metadata only.
    try:
        doc_row = DocumentModel(
            id=document_id,
            user_id=user_id,
            filename=safe_filename,
            page_count=page_count,
            chunk_count=len(chunks),
        )
        db.add(doc_row)
        db.commit()
        logger.info(
            "Document metadata persisted: document_id=%s, filename='%s'",
            document_id,
            safe_filename,
        )
    except Exception as e:
        db.rollback()
        logger.warning(
            "Failed to persist document metadata for '%s' (non-fatal): %s",
            safe_filename,
            e,
        )

    logger.info("Document '%s' indexed successfully (document_id=%s)", safe_filename, document_id)

    return DocumentUploadResponse(
        document_id=document_id,
        filename=safe_filename,
        pages=page_count,
        characters=len(text),
        chunks=len(chunks),
        first_chunk=chunks[0],
    )
