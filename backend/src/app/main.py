from fastapi import FastAPI

from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.logging.config import configure_logging
from app.presentation.api.auth import router as auth_router
from app.presentation.api.health import router as health_router


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


settings: Settings = get_settings()
app = create_app()
