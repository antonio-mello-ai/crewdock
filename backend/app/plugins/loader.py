from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.plugins.base import Plugin

if TYPE_CHECKING:
    from fastapi import FastAPI

logger = logging.getLogger(__name__)


class PluginLoader:
    """Discovers and manages plugin lifecycle."""

    def __init__(self) -> None:
        self._plugins: dict[str, Plugin] = {}

    def register(self, plugin: Plugin) -> None:
        self._plugins[plugin.name] = plugin
        logger.info("Plugin registered: %s v%s", plugin.name, plugin.version)

    async def load_all(self, app: FastAPI) -> None:
        for name, plugin in self._plugins.items():
            try:
                await plugin.on_load(app)
                for router in plugin.get_routers():
                    app.include_router(router, prefix="/api/v1/plugins")
                logger.info("Plugin loaded: %s", name)
            except Exception:
                logger.exception("Failed to load plugin: %s", name)

    async def unload_all(self) -> None:
        for name, plugin in self._plugins.items():
            try:
                await plugin.on_unload()
                logger.info("Plugin unloaded: %s", name)
            except Exception:
                logger.exception("Failed to unload plugin: %s", name)

    def list_plugins(self) -> list[dict[str, str]]:
        return [
            {"name": p.name, "version": p.version, "description": p.description}
            for p in self._plugins.values()
        ]


plugin_loader = PluginLoader()
