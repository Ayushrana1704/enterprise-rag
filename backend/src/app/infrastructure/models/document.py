from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.database import Base


class DocumentModel(Base):
    """Persists metadata for every indexed document.

    One row per upload.  The document_id is a UUID generated at upload time
    and stored in every Qdrant point payload so vectors can later be filtered
    or grouped by document.

    user_id is nullable to preserve backward-compatibility with anonymous
    uploads (no authenticated user).
    """

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
