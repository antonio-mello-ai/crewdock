from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class QMDClient:
    """HTTP client for QMD REST wrapper.

    Talks to the thin REST wrapper (qmd-wrapper.py) that calls QMD CLI.
    Decoupled from MCP protocol — when QMD evolves, only the wrapper changes.
    """

    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self.base_url = (base_url or settings.qmd_base_url).rstrip("/")
        self.timeout = timeout

    async def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}{path}",
                json=body,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            result: dict[str, Any] = response.json()
            return result

    async def search(
        self,
        query: str,
        *,
        collection: str | None = None,
        limit: int = 10,
        min_score: float = 0,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"query": query, "limit": limit}
        if collection:
            body["collection"] = collection
        return await self._post("/search", body)

    async def vector_search(
        self,
        query: str,
        *,
        collection: str | None = None,
        limit: int = 10,
        min_score: float = 0.3,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"query": query, "limit": limit}
        if collection:
            body["collection"] = collection
        return await self._post("/vector_search", body)

    async def deep_search(
        self,
        query: str,
        *,
        collection: str | None = None,
        limit: int = 10,
        min_score: float = 0,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"query": query, "limit": limit}
        if collection:
            body["collection"] = collection
        return await self._post("/deep_search", body)

    async def get(self, file: str) -> dict[str, Any]:
        return await self._post("/get", {"file": file})

    async def status(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.base_url}/health")
            response.raise_for_status()
            result: dict[str, Any] = response.json()
            return result


qmd_client = QMDClient()
