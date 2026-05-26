import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.plugin import PluginRecord
from app.schemas.plugin import PluginCreate, PluginResponse, PluginUpdate

router = APIRouter(prefix="/plugins", tags=["plugins"], dependencies=[Depends(verify_token)])


@router.get("", response_model=list[PluginResponse])
async def list_plugins(
    session: AsyncSession = Depends(get_session),
) -> list[PluginRecord]:
    result = await session.execute(select(PluginRecord).order_by(PluginRecord.name))
    return list(result.scalars().all())


@router.post("", response_model=PluginResponse, status_code=status.HTTP_201_CREATED)
async def register_plugin(
    data: PluginCreate,
    session: AsyncSession = Depends(get_session),
) -> PluginRecord:
    plugin = PluginRecord(**data.model_dump())
    session.add(plugin)
    await session.commit()
    await session.refresh(plugin)
    return plugin


@router.patch("/{plugin_id}", response_model=PluginResponse)
async def update_plugin(
    plugin_id: uuid.UUID,
    data: PluginUpdate,
    session: AsyncSession = Depends(get_session),
) -> PluginRecord:
    plugin = await session.get(PluginRecord, plugin_id)
    if plugin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plugin not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plugin, field, value)
    await session.commit()
    await session.refresh(plugin)
    return plugin
