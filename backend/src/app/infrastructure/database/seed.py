import logging
from uuid import uuid4

from app.infrastructure.database.models import UserModel
from app.infrastructure.database.session import SessionLocal
from app.infrastructure.security.password import hash_password

logger = logging.getLogger(__name__)


def seed_admin():
    db = SessionLocal()

    existing = (
        db.query(UserModel)
        .filter(UserModel.email == "admin@company.com")
        .first()
    )

    if existing:
        db.close()
        return

    admin = UserModel(
        id=str(uuid4()),
        email="admin@company.com",
        name="Administrator",
        role="ADMIN",
        hashed_password=hash_password("Password@123"),
        is_active=True,
    )

    db.add(admin)
    db.commit()
    db.close()

    logger.info("Admin user created")
