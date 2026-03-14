import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"], dependencies=[Depends(verify_token)])


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    agent_id: uuid.UUID | None = Query(default=None),
    task_status: TaskStatus | None = Query(default=None, alias="status"),
    session: AsyncSession = Depends(get_session),
) -> list[Task]:
    query = select(Task).order_by(Task.created_at.desc())
    if agent_id is not None:
        query = query.where(Task.agent_id == agent_id)
    if task_status is not None:
        query = query.where(Task.status == task_status)
    result = await session.execute(query)
    return list(result.scalars().all())


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Task:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    session: AsyncSession = Depends(get_session),
) -> Task:
    task = Task(**data.model_dump())
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    data: TaskUpdate,
    session: AsyncSession = Depends(get_session),
) -> Task:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    await session.commit()
    await session.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    await session.delete(task)
    await session.commit()
