from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.infrastructure.models.conversation import ConversationModel, MessageModel


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_conversation(self, conversation: ConversationModel) -> ConversationModel:
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def get_conversation(
        self, conversation_id: str, user_id: str
    ) -> ConversationModel | None:
        return (
            self.db.query(ConversationModel)
            .filter(
                ConversationModel.id == conversation_id,
                ConversationModel.user_id == user_id,
            )
            .first()
        )

    def list_conversations(self, user_id: str) -> list[ConversationModel]:
        return (
            self.db.query(ConversationModel)
            .filter(ConversationModel.user_id == user_id)
            .order_by(ConversationModel.updated_at.desc())
            .all()
        )

    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        conversation = self.get_conversation(conversation_id, user_id)
        if conversation is None:
            return False
        self.db.delete(conversation)
        self.db.commit()
        return True

    def rename_conversation(
        self, conversation_id: str, user_id: str, title: str
    ) -> ConversationModel | None:
        conversation = self.get_conversation(conversation_id, user_id)
        if conversation is None:
            return None
        conversation.title = title
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def add_message(self, message: MessageModel) -> MessageModel:
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def touch_updated_at(self, conversation_id: str, user_id: str) -> None:
        self.db.query(ConversationModel).filter(
            ConversationModel.id == conversation_id,
            ConversationModel.user_id == user_id,
        ).update({"updated_at": datetime.now(timezone.utc)})
        self.db.commit()
