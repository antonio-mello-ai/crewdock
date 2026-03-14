import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(max_length=200)
    description: str | None = None
    status: TaskStatus = TaskStatus.SCHEDULED
    schedule: str | None = None
    agent_id: uuid.UUID


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = None
    status: TaskStatus | None = None
    schedule: str | None = None
    agent_id: uuid.UUID | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    status: TaskStatus
    schedule: str | None
    agent_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
