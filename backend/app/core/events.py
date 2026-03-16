import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.database import engine
from app.plugins.loader import plugin_loader
from app.services.gateway.openclaw import OpenClawGateway
from app.services.gateway.registry import gateway_registry
from app.services.scheduler import load_scheduled_tasks, start_scheduler, stop_scheduler
from app.services.telegram_bot import start_telegram_bot, stop_telegram_bot

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

    # Startup — Scheduler
    start_scheduler()
    await load_scheduled_tasks()

    # Startup — Telegram Bot
    await start_telegram_bot()

    yield

    # Shutdown
    await stop_telegram_bot()
    stop_scheduler()
    await plugin_loader.unload_all()
    await openclaw.disconnect()
    await engine.dispose()
    logger.info("Shutdown complete")
