from __future__ import annotations

import contextlib
import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from app.services.gateway.base import (
    AgentInfo,
    AgentRuntimeStatus,
    GatewayAdapter,
    SessionInfo,
)

logger = logging.getLogger(__name__)


class OpenClawGateway(GatewayAdapter):
    """OpenClaw WebSocket RPC gateway implementation.

    Connects to the OpenClaw gateway via WebSocket for agent management.
    Falls back to stub responses when gateway is unreachable.
    """

    def __init__(self, url: str, auth_token: str) -> None:
        self.url = url
        self.auth_token = auth_token
        self._connected = False
        self._ws: Any = None

    async def connect(self) -> None:
        """Attempt to connect to the OpenClaw gateway."""
        if not self.url or self.url == "ws://localhost:18789":
            logger.info("OpenClaw gateway URL not configured, running in stub mode")
            self._connected = False
            return

        try:
            import websockets

            ws_url = self.url
            if self.auth_token:
                separator = "&" if "?" in ws_url else "?"
                ws_url = f"{ws_url}{separator}token={self.auth_token}"

            self._ws = await websockets.connect(ws_url, open_timeout=5)
            self._connected = True
            logger.info("Connected to OpenClaw gateway at %s", self.url)
        except Exception as e:
            logger.warning("Failed to connect to OpenClaw gateway: %s", e)
            self._connected = False

    async def disconnect(self) -> None:
        """Disconnect from the OpenClaw gateway."""
        if self._ws is not None:
            with contextlib.suppress(Exception):
                await self._ws.close()
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    async def _rpc_call(self, method: str, params: dict[str, Any] | None = None) -> Any:
        """Send an RPC call to the gateway. Returns None if not connected."""
        if not self._connected or self._ws is None:
            return None

        try:
            request = {"jsonrpc": "2.0", "method": method, "id": 1}
            if params:
                request["params"] = params

            await self._ws.send(json.dumps(request))
            response_text = await self._ws.recv()
            response = json.loads(response_text)
            return response.get("result")
        except Exception as e:
            logger.warning("RPC call %s failed: %s", method, e)
            self._connected = False
            return None

    async def list_agents(self) -> list[AgentInfo]:
        """List agents from the gateway, or return empty if not connected."""
        result = await self._rpc_call("agents.list")
        if result is None:
            return []

        agents = []
        for agent_data in result if isinstance(result, list) else []:
            agents.append(
                AgentInfo(
                    id=agent_data.get("id", ""),
                    name=agent_data.get("name", ""),
                    model=agent_data.get("model", ""),
                    status=AgentRuntimeStatus.ONLINE,
                )
            )
        return agents

    async def get_agent_status(self, agent_id: str) -> AgentRuntimeStatus:
        """Get agent status from gateway."""
        if not self._connected:
            return AgentRuntimeStatus.OFFLINE

        result = await self._rpc_call("agents.status", {"agent_id": agent_id})
        if result is None:
            return AgentRuntimeStatus.OFFLINE

        status_map = {
            "online": AgentRuntimeStatus.ONLINE,
            "busy": AgentRuntimeStatus.BUSY,
            "error": AgentRuntimeStatus.ERROR,
        }
        return status_map.get(str(result), AgentRuntimeStatus.OFFLINE)

    def send_message(
        self, agent_id: str, message: str, session_id: str | None = None
    ) -> AsyncIterator[str]:
        """Send a message to an agent via the gateway."""

        async def _stream() -> AsyncIterator[str]:
            if not self._connected:
                yield f"[Gateway not connected] Your message: {message}"
                return

            result = await self._rpc_call(
                "agent.message",
                {
                    "agent_id": agent_id,
                    "message": message,
                    "session_id": session_id,
                },
            )
            if result is not None:
                yield str(result)
            else:
                yield f"[Gateway error] Could not deliver message to agent {agent_id}"

        return _stream()

    async def list_sessions(self, agent_id: str) -> list[SessionInfo]:
        """List sessions for an agent."""
        result = await self._rpc_call("sessions.list", {"agent_id": agent_id})
        if result is None:
            return []

        sessions = []
        for session_data in result if isinstance(result, list) else []:
            sessions.append(
                SessionInfo(
                    id=session_data.get("id", ""),
                    agent_id=agent_id,
                    created_at=session_data.get("created_at", ""),
                )
            )
        return sessions
