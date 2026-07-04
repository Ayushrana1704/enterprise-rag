from fastapi import FastAPI

from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.logging.config import configure_logging
from app.presentation.api.auth import router as auth_router
from app.presentation.api.health import router as health_router
from app.presentation.api.rbac import router as rbac_router
from app.presentation.api.documents import router as documents_router
from app.presentation.api import rag

def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        debug=settings.app_debug,
        version="0.1.0",
    )
    register_routes(app)
    return app


def register_routes(app: FastAPI) -> None:
    app.include_router(health_router)
    app.include_router(auth_router, prefix="/auth")
    app.include_router(rbac_router)
    app.include_router(documents_router, prefix="/documents")
    app.include_router(rag.router, prefix="/rag",)
    


settings: Settings = get_settings()
app = create_app()
