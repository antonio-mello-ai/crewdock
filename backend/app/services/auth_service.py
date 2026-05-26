from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    result: str = pwd_context.hash(password)
    return result


def verify_password(plain: str, hashed: str) -> bool:
    result: bool = pwd_context.verify(plain, hashed)
    return result


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(UTC) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    secret = settings.local_auth_token or "crewdock-secret-change-me"
    encoded: str = jwt.encode(to_encode, secret, algorithm=ALGORITHM)
    return encoded


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        secret = settings.local_auth_token or "crewdock-secret-change-me"
        payload: dict[str, Any] = jwt.decode(token, secret, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    name: str,
    is_admin: bool = False,
) -> User:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        name=name,
        is_admin=is_admin,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user
