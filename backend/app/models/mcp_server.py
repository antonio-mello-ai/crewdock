from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class McpServer(Base):
    __tablename__ = "mcp_servers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    transport: Mapped[str] = mapped_column(String(20))  # "stdio" or "sse"
    # For stdio: command + args; for sse: url
    command: Mapped[str | None] = mapped_column(String(500), default=None)
    args: Mapped[list[str] | None] = mapped_column(JSONB, default=None)
    url: Mapped[str | None] = mapped_column(String(500), default=None)
    env: Mapped[dict[str, str] | None] = mapped_column(JSONB, default=None)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
