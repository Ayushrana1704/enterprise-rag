from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict

from app.application.auth.service import AuthenticationService
from app.domain.auth.roles import Role
from app.domain.auth.user import User
from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.repositories.demo_user_repository import demo_user_repository
from app.infrastructure.security.jwt import create_access_token, decode_access_token

router = APIRouter(tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)
authentication_service = AuthenticationService()


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    expires_at: datetime
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    role: Role


def raise_unauthorized() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> User:
    if credentials is None:
        raise_unauthorized()

    payload = decode_access_token(credentials.credentials, settings)
    if payload is None:
        raise_unauthorized()

    email = payload.get("sub")
    if not isinstance(email, str):
        raise_unauthorized()

    user = demo_user_repository.get_by_email(email)
    if user is None:
        raise_unauthorized()

    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, settings: Settings = Depends(get_settings)) -> TokenResponse:
    user = authentication_service.authenticate(
        demo_user_repository.get_by_email(payload.email),
        payload.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token, expires_at = create_access_token(user, settings)
    return TokenResponse(access_token=access_token, expires_at=expires_at)


@router.get("/me", response_model=CurrentUserResponse)
def get_current_user(user: User = Depends(get_authenticated_user)) -> User:
    return user
