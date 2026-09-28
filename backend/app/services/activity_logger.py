from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity


async def log_activity(
    session: AsyncSession,
    *,
    agent_id: uuid.UUID,
    action: str,
    payload: dict[str, Any] | None = None,
    task_id: uuid.UUID | None = None,
) -> Activity:
    """Log an activity entry. Call within an existing session transaction."""
    activity = Activity(
        agent_id=agent_id,
        action=action,
        payload=payload,
        task_id=task_id,
    )
    session.add(activity)
    await session.flush()
    return activity
