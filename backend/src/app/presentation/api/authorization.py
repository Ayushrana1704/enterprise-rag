from collections.abc import Iterable

from fastapi import Depends, HTTPException, status

from app.domain.auth.roles import Role
from app.domain.auth.user import User
from app.presentation.api.auth import get_authenticated_user


class RequireRole:
    def __init__(self, *allowed_roles: Role) -> None:
        self.allowed_roles = set(allowed_roles)

    def __call__(self, user: User = Depends(get_authenticated_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return user


def role_names(roles: Iterable[Role]) -> list[str]:
    return [role.value for role in roles]
