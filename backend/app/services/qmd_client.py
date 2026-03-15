from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class QMDClient:
    """MCP HTTP client for QMD search engine."""

    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self.base_url = (base_url or settings.qmd_base_url).rstrip("/")
        self.timeout = timeout
        self._request_id = 0

    async def _mcp_call(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Call a QMD tool via MCP HTTP protocol."""
        self._request_id += 1
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
            "id": self._request_id,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/mcp",
                json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
            response.raise_for_status()

            # MCP HTTP may return SSE or direct JSON
            content_type = response.headers.get("content-type", "")

            if "text/event-stream" in content_type:
                # Parse SSE response — extract last data line
                return self._parse_sse(response.text)
            else:
                result: dict[str, Any] = response.json()
                return self._extract_result(result)

    def _parse_sse(self, sse_text: str) -> dict[str, Any]:
        """Parse SSE response and extract the tool result."""
        last_data = ""
        for line in sse_text.split("\n"):
            if line.startswith("data: "):
                last_data = line[6:]

        if not last_data:
            return {"results": []}

        try:
            parsed = json.loads(last_data)
            return self._extract_result(parsed)
        except json.JSONDecodeError:
            return {"results": [], "content": last_data}

    def _extract_result(self, mcp_response: dict[str, Any]) -> dict[str, Any]:
        """Extract tool result from MCP JSON-RPC response."""
        result = mcp_response.get("result", mcp_response)
        # MCP tool results are in result.content[0].text
        content = result.get("content", [])
        if content and isinstance(content, list) and len(content) > 0:
            text = content[0].get("text", "")
            try:
                parsed: dict[str, Any] = json.loads(text)
                return parsed
            except (json.JSONDecodeError, TypeError):
                return {"content": text, "results": []}
        extracted: dict[str, Any] = result
        return extracted

    async def search(
        self,
        query: str,
        *,
        collection: str | None = None,
        limit: int = 10,
        min_score: float = 0,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {"query": query, "limit": limit, "minScore": min_score}
        if collection:
            args["collection"] = collection
        return await self._mcp_call("search", args)

    async def vector_search(
        self,
        query: str,
        *,
        collection: str | None = None,
        limit: int = 10,
        min_score: float = 0.3,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {"query": query, "limit": limit, "minScore": min_score}
        if collection:
            args["collection"] = collection
        return await self._mcp_call("vector_search", args)

    async def deep_search(
        self,
        query: str,
        *,
        collection: str | None = None,
        limit: int = 10,
        min_score: float = 0,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {"query": query, "limit": limit, "minScore": min_score}
        if collection:
            args["collection"] = collection
        return await self._mcp_call("deep_search", args)

    async def get(self, file: str) -> dict[str, Any]:
        return await self._mcp_call("get", {"file": file})

    async def status(self) -> dict[str, Any]:
        return await self._mcp_call("status", {})


qmd_client = QMDClient()
