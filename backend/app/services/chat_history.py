from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_memory_store: dict[str, list[dict[str, str]]] = {}
MAX_MESSAGES = 20


async def _get_redis() -> Any:
    """Try to get a Redis connection."""
    if not settings.redis_url:
        return None
    try:
        import redis.asyncio as aioredis

        r = aioredis.from_url(settings.redis_url)
        await r.ping()  # type: ignore[misc]
        return r
    except Exception:
        return None


async def get_history(session_id: str) -> list[dict[str, str]]:
    """Get chat history for a session."""
    r = await _get_redis()
    if r is not None:
        try:
            data = await r.get(f"chat:{session_id}")
            await r.aclose()
            if data:
                result: list[dict[str, str]] = json.loads(data)
                return result
            return []
        except Exception:
            pass

    return _memory_store.get(session_id, [])


async def save_history(session_id: str, messages: list[dict[str, str]]) -> None:
    """Save chat history for a session."""
    # Trim to max
    trimmed = messages[-MAX_MESSAGES:] if len(messages) > MAX_MESSAGES else messages

    r = await _get_redis()
    if r is not None:
        try:
            await r.set(f"chat:{session_id}", json.dumps(trimmed), ex=86400)  # 24h TTL
            await r.aclose()
            return
        except Exception:
            pass

    _memory_store[session_id] = trimmed


async def append_message(session_id: str, role: str, content: str) -> list[dict[str, str]]:
    """Append a message to history and return updated history."""
    history = await get_history(session_id)
    history.append({"role": role, "content": content})
    await save_history(session_id, history)
    return history
