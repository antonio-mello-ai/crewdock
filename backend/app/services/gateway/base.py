from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from enum import StrEnum


class AgentRuntimeStatus(StrEnum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    ERROR = "error"


@dataclass
class AgentInfo:
    id: str
    name: str
    model: str
    status: AgentRuntimeStatus


@dataclass
class SessionInfo:
    id: str
    agent_id: str
    created_at: str


class GatewayAdapter(ABC):
    """Abstract interface for agent runtime gateways."""

    @abstractmethod
    async def connect(self) -> None: ...

    @abstractmethod
    async def disconnect(self) -> None: ...

    @abstractmethod
    async def list_agents(self) -> list[AgentInfo]: ...

    @abstractmethod
    async def get_agent_status(self, agent_id: str) -> AgentRuntimeStatus: ...

    @abstractmethod
    def send_message(
        self, agent_id: str, message: str, session_id: str | None = None
    ) -> AsyncIterator[str]: ...

    @abstractmethod
    async def list_sessions(self, agent_id: str) -> list[SessionInfo]: ...
