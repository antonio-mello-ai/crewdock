import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.approval import ApprovalStatus


class ApprovalCreate(BaseModel):
    title: str = Field(max_length=200)
    description: str | None = None
    payload: dict[str, object] | None = None
    agent_id: uuid.UUID
    task_id: uuid.UUID | None = None


class ApprovalDecision(BaseModel):
    status: ApprovalStatus


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    status: ApprovalStatus
    payload: dict[str, object] | None
    agent_id: uuid.UUID
    task_id: uuid.UUID | None
    resolved_at: datetime | None
    created_at: datetime
