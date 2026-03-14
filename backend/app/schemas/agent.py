import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.agent import AgentStatus


class AgentCreate(BaseModel):
    name: str = Field(max_length=100)
    model: str = Field(max_length=100)
    description: str | None = None
    avatar_url: str | None = None
    config: dict[str, object] | None = None


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    model: str | None = Field(default=None, max_length=100)
    status: AgentStatus | None = None
    description: str | None = None
    avatar_url: str | None = None
    config: dict[str, object] | None = None


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    model: str
    status: AgentStatus
    description: str | None
    avatar_url: str | None
    config: dict[str, object] | None
    created_at: datetime
    updated_at: datetime
