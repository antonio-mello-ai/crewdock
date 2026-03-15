from __future__ import annotations

import logging
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.task import Task, TaskStatus
from app.services.activity_logger import log_activity

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def execute_task(task_id: str) -> None:
    """Execute a scheduled task. Called by APScheduler."""
    async with async_session_factory() as session:
        task = await session.get(Task, task_id)
        if task is None:
            logger.warning("Scheduled task %s not found, removing job", task_id)
            scheduler.remove_job(task_id)
            return

        if task.status == TaskStatus.DONE:
            logger.info("Task %s already done, skipping", task.title)
            return

        logger.info("Executing scheduled task: %s", task.title)

        # Move to in_progress
        task.status = TaskStatus.IN_PROGRESS
        task.last_run_at = datetime.now(UTC)
        await log_activity(
            session,
            agent_id=task.agent_id,
            action="task.scheduled_run",
            payload={"title": task.title},
            task_id=task.id,
        )
        await session.commit()

        # TODO: When gateway is connected, actually send the task to the agent
        # For now, mark as done after "execution"
        task.status = TaskStatus.DONE
        await session.commit()

        logger.info("Scheduled task completed: %s", task.title)


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
                logger.info(
                    "Registered scheduled task: %s (%s)", task.title, task.schedule
                )
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
    """Start the APScheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler() -> None:
    """Stop the APScheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")
