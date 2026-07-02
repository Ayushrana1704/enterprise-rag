import logging
from logging.config import dictConfig

from app.infrastructure.config.settings import Settings


def configure_logging(settings: Settings) -> None:
    log_level = settings.app_log_level.upper()

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "level": log_level,
                }
            },
            "root": {
                "handlers": ["console"],
                "level": log_level,
            },
        }
    )

    logging.getLogger(__name__).info("Logging configured", extra={"app_env": settings.app_env})