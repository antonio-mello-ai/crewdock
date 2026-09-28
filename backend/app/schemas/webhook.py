import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WebhookCreate(BaseModel):
    url: str = Field(max_length=500)
    events: list[str]
    secret: str | None = None
    enabled: bool = True


class WebhookUpdate(BaseModel):
    url: str | None = Field(default=None, max_length=500)
    events: list[str] | None = None
    secret: str | None = None
    enabled: bool | None = None


class WebhookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    events: list[str]
    enabled: bool
    created_at: datetime
