import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.approval import Approval, ApprovalStatus
from app.schemas.approval import ApprovalCreate, ApprovalDecision, ApprovalResponse
from app.services.activity_logger import log_activity

router = APIRouter(prefix="/approvals", tags=["approvals"], dependencies=[Depends(verify_token)])


@router.get("", response_model=list[ApprovalResponse])
async def list_approvals(
    approval_status: ApprovalStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
) -> list[Approval]:
    query = select(Approval).order_by(Approval.created_at.desc()).limit(limit)
    if approval_status is not None:
        query = query.where(Approval.status == approval_status)
    result = await session.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
async def create_approval(
    data: ApprovalCreate,
    session: AsyncSession = Depends(get_session),
) -> Approval:
    approval = Approval(**data.model_dump())
    session.add(approval)
    await log_activity(
        session,
        agent_id=data.agent_id,
        action="approval.requested",
        payload={"title": data.title},
        task_id=data.task_id,
    )
    await session.commit()
    await session.refresh(approval)
    return approval


@router.post("/{approval_id}/decide", response_model=ApprovalResponse)
async def decide_approval(
    approval_id: uuid.UUID,
    decision: ApprovalDecision,
    session: AsyncSession = Depends(get_session),
) -> Approval:
    approval = await session.get(Approval, approval_id)
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Approval already {approval.status}",
        )

    if decision.status not in (ApprovalStatus.APPROVED, ApprovalStatus.REJECTED):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Decision must be 'approved' or 'rejected'",
        )

    approval.status = decision.status
    approval.resolved_at = datetime.now(UTC)

    await log_activity(
        session,
        agent_id=approval.agent_id,
        action=f"approval.{decision.status}",
        payload={"title": approval.title},
        task_id=approval.task_id,
    )
    await session.commit()
    await session.refresh(approval)
    return approval
