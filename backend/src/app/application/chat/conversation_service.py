import re
import uuid
from datetime import datetime, timezone

from app.application.exceptions import ConversationNotFoundError
from app.domain.chat.conversation import Conversation, Message, MessageCitation
from app.infrastructure.models.conversation import ConversationModel, MessageModel
from app.infrastructure.repositories.conversation_repository import (
    ConversationRepository,
)

_MAX_TITLE_LENGTH = 60


def _build_title(first_user_message: str) -> str:
    """Derive a conversation title from the first user message.

    Steps:
      1. Strip leading/trailing whitespace.
      2. Collapse internal whitespace runs to a single space.
      3. Truncate to _MAX_TITLE_LENGTH characters.
      4. Append "..." if truncated.
    """
    trimmed = first_user_message.strip()
    collapsed = re.sub(r"\s+", " ", trimmed)
    if len(collapsed) <= _MAX_TITLE_LENGTH:
        return collapsed
    return collapsed[:_MAX_TITLE_LENGTH] + "..."


def _map_message(orm: MessageModel) -> Message:
    raw_citations = orm.citations or []
    citations = [
        MessageCitation(
            filename=c.get("filename", ""),
            chunk_index=c.get("chunk_index"),
            score=c.get("score", 0.0),
            preview=c.get("preview", ""),
        )
        for c in raw_citations
    ]
    return Message(
        id=orm.id,
        conversation_id=orm.conversation_id,
        role=orm.role,
        content=orm.content,
        citations=citations,
        created_at=orm.created_at,
    )


def _map_conversation(orm: ConversationModel) -> Conversation:
    return Conversation(
        id=orm.id,
        user_id=orm.user_id,
        title=orm.title,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        messages=[_map_message(m) for m in orm.messages],
    )


class ConversationService:
    def __init__(self, repository: ConversationRepository) -> None:
        self.repository = repository

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create_conversation(self, user_id: str, first_message: str) -> Conversation:
        """Create a new conversation and auto-generate its title."""
        title = _build_title(first_message)
        orm = ConversationModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
        )
        return _map_conversation(self.repository.create_conversation(orm))

    def get_conversation(self, conversation_id: str, user_id: str) -> Conversation:
        """Return the conversation or raise ConversationNotFoundError."""
        orm = self.repository.get_conversation(conversation_id, user_id)
        if orm is None:
            raise ConversationNotFoundError(
                f"Conversation '{conversation_id}' not found."
            )
        return _map_conversation(orm)

    def list_conversations(self, user_id: str) -> list[Conversation]:
        """Return all conversations for the user, newest first."""
        return [
            _map_conversation(orm)
            for orm in self.repository.list_conversations(user_id)
        ]

    def rename_conversation(
        self, conversation_id: str, user_id: str, title: str
    ) -> Conversation:
        """Rename a conversation title or raise ConversationNotFoundError."""
        orm = self.repository.rename_conversation(conversation_id, user_id, title)
        if orm is None:
            raise ConversationNotFoundError(
                f"Conversation '{conversation_id}' not found."
            )
        return _map_conversation(orm)

    def delete_conversation(self, conversation_id: str, user_id: str) -> None:
        """Delete the conversation or raise ConversationNotFoundError."""
        deleted = self.repository.delete_conversation(conversation_id, user_id)
        if not deleted:
            raise ConversationNotFoundError(
                f"Conversation '{conversation_id}' not found."
            )

    def append_message(
        self,
        conversation_id: str,
        user_id: str,
        role: str,
        content: str,
        citations: list[dict] | None = None,
    ) -> Message:
        """Append a message and bump the conversation's updated_at timestamp."""
        # Ownership is verified: get_conversation filters by both conversation_id
        # and user_id, so it returns None when the conversation doesn't belong to
        # the caller — surfaced as NotFound before any write occurs.
        orm_conversation = self.repository.get_conversation(conversation_id, user_id)
        if orm_conversation is None:
            raise ConversationNotFoundError(
                f"Conversation '{conversation_id}' not found."
            )

        orm_message = MessageModel(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role=role,
            content=content,
            citations=citations or [],
        )
        saved = self.repository.add_message(orm_message)
        self.repository.touch_updated_at(conversation_id, user_id)
        return _map_message(saved)

    def auto_title(self, text: str) -> str:
        """Expose the title-generation logic for callers that need it standalone."""
        return _build_title(text)
