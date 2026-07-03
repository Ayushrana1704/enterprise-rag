from app.infrastructure.repositories.user_repository import UserRepository


class AuthenticationService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def authenticate(self, email: str, password: str):
        from app.infrastructure.security.password import verify_password

        user = self.repository.get_by_email(email)

        if user is None:
            return None

        if not user.is_active:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user