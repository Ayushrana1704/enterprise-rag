from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt

from app.domain.auth.user import User
from app.infrastructure.config.settings import Settings


def create_access_token(user: User, settings: Settings) -> tuple[str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes,
    )
    payload: dict[str, Any] = {
        "sub": user.email,
        "name": user.name,
        "role": user.role.value,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    return token, expires_at


def decode_access_token(token: str, settings: Settings) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
