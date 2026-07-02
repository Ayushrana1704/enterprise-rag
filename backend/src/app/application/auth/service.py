from app.domain.auth.user import User
from app.infrastructure.security.password import verify_password


class AuthenticationService:
    def authenticate(self, user: User | None, password: str) -> User | None:
        if user is None or not user.is_active:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user
