from abc import ABC, abstractmethod

from fastapi import APIRouter, FastAPI


class Plugin(ABC):
    """Base class for all plugins."""

    name: str
    version: str
    description: str = ""

    @abstractmethod
    async def on_load(self, app: FastAPI) -> None:
        """Called when the plugin is loaded. Register routers, handlers, etc."""

    async def on_unload(self) -> None:  # noqa: B027
        """Called when the plugin is unloaded. Cleanup resources."""

    def get_routers(self) -> list[APIRouter]:
        """Return additional API routers to register."""
        return []

    def get_frontend_manifest(self) -> dict[str, object] | None:
        """Return a manifest for the frontend to render plugin UI."""
        return None
