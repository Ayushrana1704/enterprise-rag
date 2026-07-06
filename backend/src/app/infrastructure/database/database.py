from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase

from app.infrastructure.config.settings import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    echo=settings.app_debug,
    pool_pre_ping=True,
)


class Base(DeclarativeBase):
    pass


import app.infrastructure.database.models
import app.infrastructure.models.conversation