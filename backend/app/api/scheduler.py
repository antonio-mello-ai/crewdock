from fastapi import APIRouter, Depends

from app.core.security import verify_token
from app.services.scheduler import load_scheduled_tasks, scheduler

router = APIRouter(prefix="/scheduler", tags=["scheduler"], dependencies=[Depends(verify_token)])


@router.get("/jobs")
async def list_jobs() -> list[dict[str, object]]:
    """List all scheduled jobs."""
    jobs = scheduler.get_jobs()
    return [
        {
            "id": job.id,
            "name": job.name,
            "next_run_time": str(job.next_run_time) if job.next_run_time else None,
            "trigger": str(job.trigger),
        }
        for job in jobs
    ]


@router.post("/reload")
async def reload_scheduler() -> dict[str, str]:
    """Reload all scheduled tasks from the database."""
    await load_scheduled_tasks()
    count = len(scheduler.get_jobs())
    return {"status": "ok", "jobs_loaded": str(count)}
