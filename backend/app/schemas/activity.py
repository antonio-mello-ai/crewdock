import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    action: str
    payload: dict[str, object] | None
    agent_id: uuid.UUID
    task_id: uuid.UUID | None
    created_at: datetime
