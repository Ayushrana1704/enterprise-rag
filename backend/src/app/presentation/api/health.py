from fastapi import APIRouter, Depends

from app.infrastructure.config.settings import Settings, get_settings
from app.presentation.api.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
    )
