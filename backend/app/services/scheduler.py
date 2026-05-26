from __future__ import annotations

import logging
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.task import Task, TaskStatus
from app.services.activity_logger import log_activity
from app.services.llm_service import chat_with_llm

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def execute_task(task_id: str) -> None:
    """Execute a scheduled task by sending it to the assigned agent's LLM."""
    async with async_session_factory() as session:
        task = await session.get(Task, task_id)
        if task is None:
            logger.warning("Scheduled task %s not found, removing job", task_id)
            scheduler.remove_job(task_id)
            return

        # Load agent for model and prompt
        from app.models.agent import Agent

        agent = await session.get(Agent, task.agent_id)
        if agent is None:
            logger.warning("Agent for task %s not found", task.title)
            return

        logger.info("Executing task: %s (agent: %s)", task.title, agent.name)

        # Move to in_progress
        task.status = TaskStatus.IN_PROGRESS
        task.last_run_at = datetime.now(UTC)
        await log_activity(
            session,
            agent_id=task.agent_id,
            action="task.executing",
            payload={"title": task.title},
            task_id=task.id,
        )
        await session.commit()

        # Build the task prompt
        task_prompt = task.title
        if task.description:
            task_prompt = f"{task.title}\n\n{task.description}"

        # Execute via LLM
        try:
            result = await chat_with_llm(
                model=agent.model,
                system_prompt=agent.system_prompt or agent.description,
                messages=[{"role": "user", "content": task_prompt}],
                max_tokens=2048,
            )

            # Log the result
            await log_activity(
                session,
                agent_id=task.agent_id,
                action="task.completed",
                payload={
                    "title": task.title,
                    "result": result[:500],
                },
                task_id=task.id,
            )

            # For recurring tasks, reset to scheduled
            if task.is_recurring:
                task.status = TaskStatus.SCHEDULED
            else:
                task.status = TaskStatus.DONE

            await session.commit()
            logger.info("Task completed: %s (%d chars)", task.title, len(result))

        except Exception as e:
            logger.error("Task execution failed: %s — %s", task.title, e)
            task.status = TaskStatus.FAILED
            await log_activity(
                session,
                agent_id=task.agent_id,
                action="task.failed",
                payload={"title": task.title, "error": str(e)[:200]},
                task_id=task.id,
            )
            await session.commit()


async def load_scheduled_tasks() -> None:
    """Load all recurring tasks from the database and register them with the scheduler."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(Task).where(
                Task.is_recurring.is_(True),
                Task.schedule.isnot(None),
                Task.schedule != "",
            )
        )
        tasks = result.scalars().all()

        for task in tasks:
            try:
                trigger = CronTrigger.from_crontab(task.schedule)
                scheduler.add_job(
                    execute_task,
                    trigger=trigger,
                    args=[str(task.id)],
                    id=str(task.id),
                    name=task.title,
                    replace_existing=True,
                )
                logger.info("Registered scheduled task: %s (%s)", task.title, task.schedule)
            except (ValueError, TypeError) as e:
                logger.warning(
                    "Invalid cron expression for task %s: %s — %s",
                    task.title,
                    task.schedule,
                    e,
                )

    count = len(scheduler.get_jobs())
    logger.info("Scheduler loaded %d recurring tasks", count)


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")
