import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    model: str
    tokens_in: int
    tokens_out: int
    cost_usd: Decimal
    agent_id: uuid.UUID
    task_id: uuid.UUID | None
    created_at: datetime


class CostSummary(BaseModel):
    agent_id: uuid.UUID
    agent_name: str
    total_tokens_in: int
    total_tokens_out: int
    total_cost_usd: Decimal
    entry_count: int
