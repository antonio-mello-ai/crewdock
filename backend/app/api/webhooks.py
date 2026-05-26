import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.webhook import Webhook
from app.schemas.webhook import WebhookCreate, WebhookResponse, WebhookUpdate

router = APIRouter(prefix="/webhooks", tags=["webhooks"], dependencies=[Depends(verify_token)])


@router.get("", response_model=list[WebhookResponse])
async def list_webhooks(
    session: AsyncSession = Depends(get_session),
) -> list[Webhook]:
    result = await session.execute(select(Webhook).order_by(Webhook.created_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    data: WebhookCreate,
    session: AsyncSession = Depends(get_session),
) -> Webhook:
    webhook = Webhook(**data.model_dump())
    session.add(webhook)
    await session.commit()
    await session.refresh(webhook)
    return webhook


@router.patch("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: uuid.UUID,
    data: WebhookUpdate,
    session: AsyncSession = Depends(get_session),
) -> Webhook:
    webhook = await session.get(Webhook, webhook_id)
    if webhook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(webhook, field, value)
    await session.commit()
    await session.refresh(webhook)
    return webhook


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    webhook = await session.get(Webhook, webhook_id)
    if webhook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    await session.delete(webhook)
    await session.commit()
