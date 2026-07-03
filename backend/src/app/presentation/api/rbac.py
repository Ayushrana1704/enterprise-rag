from fastapi import APIRouter, Depends

from app.domain.auth.roles import Role
from app.domain.auth.user import User
from app.presentation.api.authorization import RequireRole, role_names

router = APIRouter(tags=["RBAC"])


@router.get("/admin")
def admin_endpoint(user: User = Depends(RequireRole(Role.ADMIN))) -> dict[str, object]:
    return build_authorized_response("admin", [Role.ADMIN], user)


@router.get("/hr")
def hr_endpoint(user: User = Depends(RequireRole(Role.ADMIN, Role.HR))) -> dict[str, object]:
    return build_authorized_response("hr", [Role.ADMIN, Role.HR], user)


@router.get("/finance")
def finance_endpoint(
    user: User = Depends(RequireRole(Role.ADMIN, Role.FINANCE)),
) -> dict[str, object]:
    return build_authorized_response("finance", [Role.ADMIN, Role.FINANCE], user)


@router.get("/employee")
def employee_endpoint(
    user: User = Depends(RequireRole(Role.ADMIN, Role.HR, Role.FINANCE, Role.EMPLOYEE)),
) -> dict[str, object]:
    return build_authorized_response(
        "employee",
        [Role.ADMIN, Role.HR, Role.FINANCE, Role.EMPLOYEE],
        user,
    )


def build_authorized_response(
    resource: str,
    allowed_roles: list[Role],
    user: User,
) -> dict[str, object]:
    return {
        "resource": resource,
        "allowed_roles": role_names(allowed_roles),
        "user": {
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
    }
