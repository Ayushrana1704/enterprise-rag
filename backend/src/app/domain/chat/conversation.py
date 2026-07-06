from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class MessageCitation:
    filename: str
    chunk_index: int | None
    score: float
    preview: str


@dataclass(frozen=True)
class Message:
    id: str
    conversation_id: str
    role: str
    content: str
    citations: list[MessageCitation]
    created_at: datetime


@dataclass(frozen=True)
class Conversation:
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[Message] = field(default_factory=list)
