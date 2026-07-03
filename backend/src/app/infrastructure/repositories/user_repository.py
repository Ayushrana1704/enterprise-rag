from sqlalchemy.orm import Session

from app.infrastructure.database.models import UserModel


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> UserModel | None:
        return (
            self.db.query(UserModel)
            .filter(UserModel.email == email.lower())
            .first()
        )

    def create(self, user: UserModel) -> UserModel:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user