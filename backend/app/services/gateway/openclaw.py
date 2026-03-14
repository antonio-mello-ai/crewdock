from collections.abc import AsyncIterator

from app.services.gateway.base import (
    AgentInfo,
    AgentRuntimeStatus,
    GatewayAdapter,
    SessionInfo,
)


class OpenClawGateway(GatewayAdapter):
    """OpenClaw WebSocket RPC gateway implementation.

    Placeholder — will be implemented when OpenClaw Gateway integration begins.
    """

    def __init__(self, url: str, auth_token: str) -> None:
        self.url = url
        self.auth_token = auth_token
        self._connected = False

    async def connect(self) -> None:
        self._connected = True

    async def disconnect(self) -> None:
        self._connected = False

    async def list_agents(self) -> list[AgentInfo]:
        return []

    async def get_agent_status(self, agent_id: str) -> AgentRuntimeStatus:
        return AgentRuntimeStatus.OFFLINE

    def send_message(
        self, agent_id: str, message: str, session_id: str | None = None
    ) -> AsyncIterator[str]:
        async def _gen() -> AsyncIterator[str]:
            yield f"[OpenClaw stub] Received: {message}"

        return _gen()

    async def list_sessions(self, agent_id: str) -> list[SessionInfo]:
        return []
