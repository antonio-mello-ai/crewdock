from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
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


# Valid state transitions
TASK_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.SCHEDULED: {TaskStatus.QUEUED, TaskStatus.IN_PROGRESS},
    TaskStatus.QUEUED: {TaskStatus.IN_PROGRESS, TaskStatus.SCHEDULED},
    TaskStatus.IN_PROGRESS: {TaskStatus.DONE, TaskStatus.FAILED},
    TaskStatus.DONE: {TaskStatus.SCHEDULED},  # re-schedule
    TaskStatus.FAILED: {TaskStatus.QUEUED, TaskStatus.SCHEDULED},
}


def validate_status_transition(current: TaskStatus, target: TaskStatus) -> bool:
    """Check if a status transition is valid."""
    if current == target:
        return True
    return target in TASK_TRANSITIONS.get(current, set())


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[TaskStatus] = mapped_column(default=TaskStatus.SCHEDULED)
    schedule: Mapped[str | None] = mapped_column(String(100), default=None)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    last_run_at: Mapped[datetime | None] = mapped_column(default=None)
    next_run_at: Mapped[datetime | None] = mapped_column(default=None)
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    agent: Mapped[Agent] = relationship(back_populates="tasks")
    activities: Mapped[list[Activity]] = relationship(back_populates="task")
    costs: Mapped[list[CostEntry]] = relationship(back_populates="task")
