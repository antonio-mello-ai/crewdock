import asyncio
import json
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["events"], dependencies=[Depends(verify_token)])

# In-memory event bus (replace with Redis pub/sub when Redis is available)
_subscribers: list[asyncio.Queue[str]] = []


async def publish_event(event_type: str, data: dict[str, object]) -> None:
    """Publish an event to all SSE subscribers."""
    message = json.dumps({"type": event_type, "data": data})
    disconnected: list[asyncio.Queue[str]] = []
    for queue in _subscribers:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            disconnected.append(queue)
    for q in disconnected:
        _subscribers.remove(q)


async def _event_stream() -> AsyncGenerator[str, None]:
    queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
    _subscribers.append(queue)
    try:
        while True:
            message = await queue.get()
            yield f"data: {message}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        if queue in _subscribers:
            _subscribers.remove(queue)


@router.get("")
async def sse_events() -> StreamingResponse:
    return StreamingResponse(
        _event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
