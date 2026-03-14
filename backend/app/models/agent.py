from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.cost import CostEntry
    from app.models.task import Task


class AgentStatus(enum.StrEnum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    ERROR = "error"


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    model: Mapped[str] = mapped_column(String(100))
    status: Mapped[AgentStatus] = mapped_column(default=AgentStatus.OFFLINE)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(500), default=None)
    config: Mapped[dict[str, object] | None] = mapped_column(JSONB, default=None)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    tasks: Mapped[list[Task]] = relationship(back_populates="agent")
    activities: Mapped[list[Activity]] = relationship(back_populates="agent")
    costs: Mapped[list[CostEntry]] = relationship(back_populates="agent")
