import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.cost import CostEntry
from app.schemas.cost import CostResponse
from app.services.cost_tracker import get_summary_by_agent, get_summary_by_period

router = APIRouter(prefix="/costs", tags=["costs"], dependencies=[Depends(verify_token)])


@router.get("", response_model=list[CostResponse])
async def list_costs(
    agent_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[CostEntry]:
    query = select(CostEntry).order_by(CostEntry.created_at.desc()).limit(limit).offset(offset)
    if agent_id is not None:
        query = query.where(CostEntry.agent_id == agent_id)
    result = await session.execute(query)
    return list(result.scalars().all())


@router.get("/summary/agents")
async def cost_summary_by_agent(
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, object]]:
    return await get_summary_by_agent(session)


@router.get("/summary/period")
async def cost_summary_by_period(
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, object]]:
    return await get_summary_by_period(session, start=start, end=end)
