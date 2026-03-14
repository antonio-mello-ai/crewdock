import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SkillCreate(BaseModel):
    name: str = Field(max_length=100)
    description: str | None = None
    agent_id: uuid.UUID
    config: dict[str, object] | None = None
    enabled: bool = True


class SkillUpdate(BaseModel):
    description: str | None = None
    config: dict[str, object] | None = None
    enabled: bool | None = None


class SkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    agent_id: uuid.UUID
    config: dict[str, object] | None
    enabled: bool
    created_at: datetime
