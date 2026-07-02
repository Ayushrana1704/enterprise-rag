from fastapi import APIRouter, Depends

from app.infrastructure.config.settings import Settings, get_settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(settings: Settings = Depends(get_settings)) -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
    }