import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PluginCreate(BaseModel):
    name: str = Field(max_length=100)
    version: str = Field(max_length=50)
    description: str | None = None
    enabled: bool = False
    config: dict[str, object] | None = None


class PluginUpdate(BaseModel):
    enabled: bool | None = None
    config: dict[str, object] | None = None


class PluginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    version: str
    description: str | None
    enabled: bool
    config: dict[str, object] | None
    created_at: datetime
