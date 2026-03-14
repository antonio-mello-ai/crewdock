from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class QMDClient:
    """HTTP client for QMD search engine on the home server (via Tailscale)."""

    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self.base_url = (base_url or settings.qmd_base_url).rstrip("/")
        self.timeout = timeout

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(method, f"{self.base_url}{path}", **kwargs)
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
        params: dict[str, Any] = {"query": query, "limit": limit, "minScore": min_score}
        if collection:
            params["collection"] = collection
        return await self._request("POST", "/tools/search", json=params)

    async def vector_search(
        self,
        query: str,
        *,
        collection: str | None = None,
        limit: int = 10,
        min_score: float = 0.3,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"query": query, "limit": limit, "minScore": min_score}
        if collection:
            params["collection"] = collection
        return await self._request("POST", "/tools/vector_search", json=params)

    async def deep_search(
        self,
        query: str,
        *,
        collection: str | None = None,
        limit: int = 10,
        min_score: float = 0,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"query": query, "limit": limit, "minScore": min_score}
        if collection:
            params["collection"] = collection
        return await self._request("POST", "/tools/deep_search", json=params)

    async def get(self, file: str) -> dict[str, Any]:
        return await self._request("POST", "/tools/get", json={"file": file})

    async def status(self) -> dict[str, Any]:
        return await self._request("GET", "/tools/status")


qmd_client = QMDClient()
