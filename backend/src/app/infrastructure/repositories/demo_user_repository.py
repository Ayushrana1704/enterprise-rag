from app.domain.auth.roles import Role
from app.domain.auth.user import User
from app.infrastructure.security.password import hash_password


class DemoUserRepository:
    def __init__(self) -> None:
        self._users_by_email = self._seed_users()

    def get_by_email(self, email: str) -> User | None:
        return self._users_by_email.get(email.lower())

    @staticmethod
    def _seed_users() -> dict[str, User]:
        password = "Password@123"
        users = [
            User(
                id="demo-admin",
                email="admin@company.com",
                name="Admin User",
                role=Role.ADMIN,
                hashed_password=hash_password(password),
            ),
            User(
                id="demo-hr",
                email="hr@company.com",
                name="HR User",
                role=Role.HR,
                hashed_password=hash_password(password),
            ),
            User(
                id="demo-finance",
                email="finance@company.com",
                name="Finance User",
                role=Role.FINANCE,
                hashed_password=hash_password(password),
            ),
            User(
                id="demo-employee",
                email="employee@company.com",
                name="Employee User",
                role=Role.EMPLOYEE,
                hashed_password=hash_password(password),
            ),
        ]

        return {user.email: user for user in users}


demo_user_repository = DemoUserRepository()
