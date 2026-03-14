from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.agent import Agent
    from app.models.cost import CostEntry


class TaskStatus(enum.StrEnum):
    SCHEDULED = "scheduled"
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    FAILED = "failed"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[TaskStatus] = mapped_column(default=TaskStatus.SCHEDULED)
    schedule: Mapped[str | None] = mapped_column(String(100), default=None)
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    agent: Mapped[Agent] = relationship(back_populates="tasks")
    activities: Mapped[list[Activity]] = relationship(back_populates="task")
    costs: Mapped[list[CostEntry]] = relationship(back_populates="task")
