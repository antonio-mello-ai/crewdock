import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.database import engine
from app.plugins.loader import plugin_loader
from app.services.gateway.openclaw import OpenClawGateway
from app.services.gateway.registry import gateway_registry

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup — Gateway
    openclaw = OpenClawGateway(url=settings.gateway_url, auth_token=settings.gateway_auth_token)
    gateway_registry.register("openclaw", openclaw, default=True)
    await openclaw.connect()
    logger.info("Gateway 'openclaw' registered and connected")

    # Startup — Plugins
    await plugin_loader.load_all(app)
    logger.info("Plugins loaded: %d", len(plugin_loader.list_plugins()))

    yield

    # Shutdown
    await plugin_loader.unload_all()
    await openclaw.disconnect()
    await engine.dispose()
    logger.info("Shutdown complete")
