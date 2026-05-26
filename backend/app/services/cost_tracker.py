from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.cost import CostEntry


def calculate_cost(model: str, tokens_in: int, tokens_out: int) -> Decimal:
    """Calculate cost in USD based on model pricing config."""
    pricing: dict[str, tuple[float, float]] = {
        "claude-opus-4-6": (
            settings.anthropic_pricing_opus_input,
            settings.anthropic_pricing_opus_output,
        ),
        "claude-sonnet-4-6": (
            settings.anthropic_pricing_sonnet_input,
            settings.anthropic_pricing_sonnet_output,
        ),
    }
    input_price, output_price = pricing.get(model, (0.0, 0.0))
    cost = (tokens_in * input_price + tokens_out * output_price) / 1_000_000
    return Decimal(str(round(cost, 6)))


async def record_usage(
    session: AsyncSession,
    *,
    agent_id: uuid.UUID,
    model: str,
    tokens_in: int,
    tokens_out: int,
    task_id: uuid.UUID | None = None,
) -> CostEntry:
    """Record a token usage entry with calculated cost."""
    cost_usd = calculate_cost(model, tokens_in, tokens_out)
    entry = CostEntry(
        agent_id=agent_id,
        model=model,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_usd=cost_usd,
        task_id=task_id,
    )
    session.add(entry)
    await session.flush()
    return entry


async def get_summary_by_agent(
    session: AsyncSession,
) -> list[dict[str, Any]]:
    """Get cost summary grouped by agent."""
    query = (
        select(
            CostEntry.agent_id,
            func.sum(CostEntry.tokens_in).label("total_tokens_in"),
            func.sum(CostEntry.tokens_out).label("total_tokens_out"),
            func.sum(CostEntry.cost_usd).label("total_cost_usd"),
            func.count(CostEntry.id).label("entry_count"),
        )
        .group_by(CostEntry.agent_id)
        .order_by(func.sum(CostEntry.cost_usd).desc())
    )
    result = await session.execute(query)
    return [
        {
            "agent_id": row.agent_id,
            "total_tokens_in": row.total_tokens_in,
            "total_tokens_out": row.total_tokens_out,
            "total_cost_usd": row.total_cost_usd,
            "entry_count": row.entry_count,
        }
        for row in result.all()
    ]


async def get_summary_by_period(
    session: AsyncSession,
    *,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[dict[str, Any]]:
    """Get cost summary grouped by date."""
    date_col = func.date(CostEntry.created_at).label("date")
    query = (
        select(
            date_col,
            func.sum(CostEntry.tokens_in).label("total_tokens_in"),
            func.sum(CostEntry.tokens_out).label("total_tokens_out"),
            func.sum(CostEntry.cost_usd).label("total_cost_usd"),
            func.count(CostEntry.id).label("entry_count"),
        )
        .group_by(date_col)
        .order_by(date_col.desc())
    )
    if start is not None:
        query = query.where(CostEntry.created_at >= start)
    if end is not None:
        query = query.where(CostEntry.created_at <= end)
    result = await session.execute(query)
    return [
        {
            "date": str(row.date),
            "total_tokens_in": row.total_tokens_in,
            "total_tokens_out": row.total_tokens_out,
            "total_cost_usd": row.total_cost_usd,
            "entry_count": row.entry_count,
        }
        for row in result.all()
    ]
