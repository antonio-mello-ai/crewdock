from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhook import Webhook

logger = logging.getLogger(__name__)


def _sign_payload(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload."""
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


async def dispatch_webhooks(
    session: AsyncSession,
    event_type: str,
    data: dict[str, Any],
) -> None:
    """Send webhook notifications for an event to all matching webhooks."""
    result = await session.execute(select(Webhook).where(Webhook.enabled.is_(True)))
    webhooks = result.scalars().all()

    for webhook in webhooks:
        if event_type not in webhook.events and "*" not in webhook.events:
            continue

        payload = json.dumps({"event": event_type, "data": data})

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if webhook.secret:
            headers["X-CrewDock-Signature"] = _sign_payload(payload, webhook.secret)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(webhook.url, content=payload, headers=headers)
                logger.info(
                    "Webhook sent: %s → %s (status %d)",
                    event_type,
                    webhook.url,
                    response.status_code,
                )
        except Exception as e:
            logger.warning("Webhook failed: %s → %s — %s", event_type, webhook.url, e)
