import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillResponse, SkillUpdate

router = APIRouter(prefix="/skills", tags=["skills"], dependencies=[Depends(verify_token)])


@router.get("", response_model=list[SkillResponse])
async def list_skills(
    agent_id: uuid.UUID | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> list[Skill]:
    query = select(Skill).order_by(Skill.name)
    if agent_id is not None:
        query = query.where(Skill.agent_id == agent_id)
    result = await session.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    data: SkillCreate,
    session: AsyncSession = Depends(get_session),
) -> Skill:
    skill = Skill(**data.model_dump())
    session.add(skill)
    await session.commit()
    await session.refresh(skill)
    return skill


@router.patch("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: uuid.UUID,
    data: SkillUpdate,
    session: AsyncSession = Depends(get_session),
) -> Skill:
    skill = await session.get(Skill, skill_id)
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(skill, field, value)
    await session.commit()
    await session.refresh(skill)
    return skill


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    skill = await session.get(Skill, skill_id)
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    await session.delete(skill)
    await session.commit()
