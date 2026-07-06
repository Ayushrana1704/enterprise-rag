import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.exceptions import (
    DocumentProcessingError,
    EmbeddingError,
    LLMError,
    VectorStoreError,
)
from app.infrastructure.config.settings import get_settings
from app.infrastructure.logging.config import configure_logging
from app.presentation.api.auth import router as auth_router
from app.presentation.api.documents import router as documents_router
from app.presentation.api.health import router as health_router
from app.presentation.api.rbac import router as rbac_router
from app.presentation.api import rag

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Application startup — initializing services")
    try:
        from app.presentation.api.dependencies import get_qdrant_service
        get_qdrant_service().create_collection()
    except Exception as e:
        logger.error("Startup failed during service initialization: %s", e)
        raise
    logger.info("Application ready")
    yield


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(EmbeddingError)
    async def embedding_error_handler(request: Request, exc: EmbeddingError) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": "Embedding service unavailable. Please try again later."},
        )

    @app.exception_handler(VectorStoreError)
    async def vector_store_error_handler(request: Request, exc: VectorStoreError) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": "Vector store unavailable. Please try again later."},
        )

    @app.exception_handler(LLMError)
    async def llm_error_handler(request: Request, exc: LLMError) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": "LLM service unavailable. Please try again later."},
        )

    @app.exception_handler(DocumentProcessingError)
    async def document_processing_error_handler(
        request: Request, exc: DocumentProcessingError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": "Failed to process document."},
        )


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        debug=settings.app_debug,
        version="0.1.0",
        lifespan=lifespan,
    )
    register_exception_handlers(app)
    register_routes(app)
    return app


def register_routes(app: FastAPI) -> None:
    app.include_router(health_router)
    app.include_router(auth_router, prefix="/auth")
    app.include_router(rbac_router)
    app.include_router(documents_router, prefix="/documents")
    app.include_router(rag.router, prefix="/rag")


app = create_app()
