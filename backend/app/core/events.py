import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.database import engine
from app.services.gateway.openclaw import OpenClawGateway
from app.services.gateway.registry import gateway_registry

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    openclaw = OpenClawGateway(url=settings.gateway_url, auth_token=settings.gateway_auth_token)
    gateway_registry.register("openclaw", openclaw, default=True)
    await openclaw.connect()
    logger.info("Gateway 'openclaw' registered and connected")

    yield

    # Shutdown
    await openclaw.disconnect()
    await engine.dispose()
    logger.info("Shutdown complete")
