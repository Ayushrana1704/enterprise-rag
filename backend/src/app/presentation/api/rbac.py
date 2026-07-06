from fastapi import APIRouter, Depends

from app.domain.auth.roles import Role
from app.domain.auth.user import User
from app.presentation.api.authorization import RequireRole, role_names
from app.presentation.api.schemas import RBACResponse, RBACUserInfo

router = APIRouter(tags=["RBAC"])


@router.get("/admin", response_model=RBACResponse)
def admin_endpoint(user: User = Depends(RequireRole(Role.ADMIN))) -> RBACResponse:
    return build_authorized_response("admin", [Role.ADMIN], user)


@router.get("/hr", response_model=RBACResponse)
def hr_endpoint(user: User = Depends(RequireRole(Role.ADMIN, Role.HR))) -> RBACResponse:
    return build_authorized_response("hr", [Role.ADMIN, Role.HR], user)


@router.get("/finance", response_model=RBACResponse)
def finance_endpoint(
    user: User = Depends(RequireRole(Role.ADMIN, Role.FINANCE)),
) -> RBACResponse:
    return build_authorized_response("finance", [Role.ADMIN, Role.FINANCE], user)


@router.get("/employee", response_model=RBACResponse)
def employee_endpoint(
    user: User = Depends(RequireRole(Role.ADMIN, Role.HR, Role.FINANCE, Role.EMPLOYEE)),
) -> RBACResponse:
    return build_authorized_response(
        "employee",
        [Role.ADMIN, Role.HR, Role.FINANCE, Role.EMPLOYEE],
        user,
    )


def build_authorized_response(
    resource: str,
    allowed_roles: list[Role],
    user: User,
) -> RBACResponse:
    return RBACResponse(
        resource=resource,
        allowed_roles=role_names(allowed_roles),
        user=RBACUserInfo(email=user.email, name=user.name, role=user.role),
    )
