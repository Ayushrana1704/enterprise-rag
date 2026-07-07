import logging
from pathlib import Path
from uuid import uuid4

import fitz
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session

from app.application.rag.embedding_service import EmbeddingService
from app.domain.auth.user import User
from app.infrastructure.bm25.bm25_service import BM25Service
from app.infrastructure.database.session import get_db
from app.infrastructure.models.document import DocumentModel
from app.infrastructure.vector_store.qdrant_service import QdrantService
from app.presentation.api.auth import get_authenticated_user, get_optional_user
from app.presentation.api.dependencies import (
    get_bm25_service,
    get_embedding_service,
    get_qdrant_service,
)
from app.presentation.api.schemas import DocumentResponse, DocumentUploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Documents"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# POST /documents/upload
# ---------------------------------------------------------------------------

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
      - Every Qdrant point payload (enables per-document filtering in Phase 4+)
      - Every BM25 corpus entry (enables per-document filtering in Phase 4+)
      - The documents table in PostgreSQL (persistent document registry)

    When the caller is authenticated, user_id is stored in both indexes
    so retrieval can be scoped per user.  Unauthenticated uploads are stored
    without a user_id and are only visible to global (unfiltered) searches
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
            document_id=document_id,
        )
    except Exception as e:
        logger.warning(
            "BM25 indexing failed for '%s' (non-fatal): %s", safe_filename, e
        )

    # -- Persist document metadata to PostgreSQL --------------------------------
    # Non-critical: a DB failure must not abort a successful vector store upload.
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


# ---------------------------------------------------------------------------
# GET /documents
# ---------------------------------------------------------------------------

@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
) -> list[DocumentResponse]:
    """Return all documents belonging to the authenticated user, newest first.

    Source of truth is the documents table (PostgreSQL).
    Qdrant is not queried.
    """
    rows = (
        db.query(DocumentModel)
        .filter(DocumentModel.user_id == user.id)
        .order_by(DocumentModel.created_at.desc())
        .all()
    )
    logger.info("Listed %d documents for user_id=%s", len(rows), user.id)
    return [
        DocumentResponse(
            document_id=row.id,
            filename=row.filename,
            page_count=row.page_count,
            chunk_count=row.chunk_count,
            created_at=row.created_at,
        )
        for row in rows
    ]


# ---------------------------------------------------------------------------
# DELETE /documents/{document_id}
# ---------------------------------------------------------------------------

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_authenticated_user),
    qdrant_service: QdrantService = Depends(get_qdrant_service),
    bm25_service: BM25Service = Depends(get_bm25_service),
) -> None:
    """Permanently delete a document and all its indexed data.

    Deletion is atomic across three stores in this order:
      1. PostgreSQL row  (source of truth for ownership)
      2. Qdrant vectors  (dense index)
      3. BM25 chunks     (sparse index)

    Ownership check: the document must exist AND belong to the authenticated
    user.  Any other state returns 404 — we never leak whether a document
    exists under another user_id.

    Qdrant and BM25 deletions are best-effort after the DB row is removed.
    Failures in either store are logged but do not roll back the DB deletion,
    because a stale vector/BM25 entry will simply produce irrelevant search
    results for a document_id that no longer exists in the DB.  The operator
    can clean up via a future admin endpoint if needed.
    """
    # 1. Verify existence and ownership
    row = (
        db.query(DocumentModel)
        .filter(
            DocumentModel.id == document_id,
            DocumentModel.user_id == user.id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    filename = row.filename
    logger.info(
        "Deleting document: document_id=%s filename='%s' user_id=%s",
        document_id, filename, user.id,
    )

    # 2. Delete PostgreSQL row
    db.delete(row)
    db.commit()
    logger.info("DB row deleted: document_id=%s", document_id)

    # 3. Delete Qdrant vectors (best-effort)
    try:
        qdrant_service.delete_by_document(user_id=user.id, document_id=document_id)
    except Exception as e:
        logger.error(
            "Qdrant cleanup failed for document_id=%s (DB row already deleted): %s",
            document_id, e,
        )

    # 4. Delete BM25 chunks (best-effort)
    try:
        bm25_service.delete_by_document(document_id=document_id, user_id=user.id)
    except Exception as e:
        logger.error(
            "BM25 cleanup failed for document_id=%s (DB row already deleted): %s",
            document_id, e,
        )

    logger.info(
        "Document deleted successfully: document_id=%s filename='%s'",
        document_id, filename,
    )
    # FastAPI returns 204 No Content automatically (status_code set on decorator)
