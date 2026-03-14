import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.activity import Activity
from app.schemas.activity import ActivityResponse

router = APIRouter(prefix="/activity", tags=["activity"], dependencies=[Depends(verify_token)])


@router.get("", response_model=list[ActivityResponse])
async def list_activity(
    agent_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[Activity]:
    query = select(Activity).order_by(Activity.created_at.desc()).limit(limit).offset(offset)
    if agent_id is not None:
        query = query.where(Activity.agent_id == agent_id)
    result = await session.execute(query)
    return list(result.scalars().all())
