from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["events"], dependencies=[Depends(verify_token)])

# In-memory fallback when Redis is not available
_subscribers: list[asyncio.Queue[str]] = []
_redis_available = False


async def _get_redis() -> Any:
    """Try to connect to Redis. Returns None if unavailable."""
    global _redis_available
    if not settings.redis_url:
        return None
    try:
        import redis.asyncio as aioredis

        r = aioredis.from_url(settings.redis_url)
        await r.ping()  # type: ignore[misc]
        _redis_available = True
        return r
    except Exception:
        _redis_available = False
        return None


async def publish_event(event_type: str, data: dict[str, object]) -> None:
    """Publish an event to SSE subscribers via Redis or in-memory fallback."""
    message = json.dumps({"type": event_type, "data": data})

    # Try Redis first
    r = await _get_redis()
    if r is not None:
        try:
            await r.publish("crewdock:events", message)
            await r.aclose()
            return
        except Exception:
            pass

    # Fallback to in-memory
    disconnected: list[asyncio.Queue[str]] = []
    for queue in _subscribers:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            disconnected.append(queue)
    for q in disconnected:
        _subscribers.remove(q)


async def _event_stream_redis() -> AsyncGenerator[str, None]:
    """SSE stream via Redis pub/sub."""
    import redis.asyncio as aioredis

    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe("crewdock:events")

    try:
        # Heartbeat every 15s to keep connection alive
        while True:
            message = await asyncio.wait_for(
                pubsub.get_message(ignore_subscribe_messages=True, timeout=15.0),
                timeout=20.0,
            )
            if message and message["type"] == "message":
                yield f"data: {message['data'].decode()}\n\n"
            else:
                yield ": heartbeat\n\n"
    except (TimeoutError, asyncio.CancelledError):
        pass
    finally:
        await pubsub.unsubscribe("crewdock:events")
        await r.aclose()


async def _event_stream_memory() -> AsyncGenerator[str, None]:
    """SSE stream via in-memory queue (fallback)."""
    queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
    _subscribers.append(queue)
    try:
        while True:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield f"data: {message}\n\n"
            except TimeoutError:
                yield ": heartbeat\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        if queue in _subscribers:
            _subscribers.remove(queue)


@router.get("")
async def sse_events() -> StreamingResponse:
    r = await _get_redis()
    if r is not None:
        await r.aclose()
        stream = _event_stream_redis()
    else:
        stream = _event_stream_memory()

    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
