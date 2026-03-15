from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    name: str
    email: str


class SetupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=100)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    user = await authenticate_user(session, data.email, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(
        access_token=token,
        name=user.name,
        email=user.email,
    )


@router.post("/setup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def setup(
    data: SetupRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """Create the first admin user. Only works when no users exist."""
    from sqlalchemy import func, select

    from app.models.user import User

    count_result = await session.execute(select(func.count(User.id)))
    user_count = count_result.scalar() or 0

    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup already completed. Use /auth/login instead.",
        )

    user = await create_user(
        session,
        email=data.email,
        password=data.password,
        name=data.name,
        is_admin=True,
    )
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(
        access_token=token,
        name=user.name,
        email=user.email,
    )


@router.get("/check")
async def check_setup(
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    """Check if initial setup is needed."""
    from sqlalchemy import func, select

    from app.models.user import User

    count_result = await session.execute(select(func.count(User.id)))
    user_count = count_result.scalar() or 0

    return {"setup_required": user_count == 0, "user_count": user_count}


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    is_admin: bool


@router.get("/me", response_model=UserProfile)
async def get_profile(
    token: str = Depends(verify_token),
    session: AsyncSession = Depends(get_session),
) -> UserProfile:
    """Get current user profile from JWT token."""
    from app.services.auth_service import decode_access_token

    payload = decode_access_token(token) if token != "anonymous" else None
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    from sqlalchemy import select

    from app.models.user import User

    user_id = payload.get("sub")
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserProfile(
        id=str(user.id),
        email=user.email,
        name=user.name,
        is_admin=user.is_admin,
    )
