from dataclasses import dataclass

from app.domain.auth.roles import Role


@dataclass(frozen=True)
class User:
    id: str
    email: str
    name: str
    role: Role
    hashed_password: str
    is_active: bool = True
