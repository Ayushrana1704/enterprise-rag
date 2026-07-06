from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.application.auth.service import AuthenticationService
from app.domain.auth.user import User
from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.database.session import get_db
from app.infrastructure.repositories.user_repository import UserRepository
from app.infrastructure.security.jwt import create_access_token, decode_access_token
from app.presentation.api.schemas import CurrentUserResponse, LoginRequest, TokenResponse

router = APIRouter(tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


def raise_unauthorized() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise_unauthorized()

    payload = decode_access_token(credentials.credentials, settings)
    if payload is None:
        raise_unauthorized()

    email = payload.get("sub")
    if not isinstance(email, str):
        raise_unauthorized()

    repository = UserRepository(db)
    user = repository.get_by_email(email)

    if user is None:
        raise_unauthorized()

    return user


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> TokenResponse:
    repository = UserRepository(db)
    authentication_service = AuthenticationService(repository)

    user = authentication_service.authenticate(payload.email, payload.password)

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
