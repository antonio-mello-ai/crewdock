from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.activity import router as activity_router
from app.api.agents import router as agents_router
from app.api.approvals import router as approvals_router
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.costs import router as costs_router
from app.api.events import router as events_router
from app.api.gateway import router as gateway_router
from app.api.health import router as health_router
from app.api.knowledge import router as knowledge_router
from app.api.mcp import router as mcp_router
from app.api.plugins import router as plugins_router
from app.api.scheduler import router as scheduler_router
from app.api.skills import router as skills_router
from app.api.tasks import router as tasks_router
from app.api.webhooks import router as webhooks_router
from app.core.config import settings
from app.core.events import lifespan

API_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix=API_PREFIX)
    app.include_router(agents_router, prefix=API_PREFIX)
    app.include_router(tasks_router, prefix=API_PREFIX)
    app.include_router(activity_router, prefix=API_PREFIX)
    app.include_router(costs_router, prefix=API_PREFIX)
    app.include_router(knowledge_router, prefix=API_PREFIX)
    app.include_router(events_router, prefix=API_PREFIX)
    app.include_router(skills_router, prefix=API_PREFIX)
    app.include_router(approvals_router, prefix=API_PREFIX)
    app.include_router(webhooks_router, prefix=API_PREFIX)
    app.include_router(plugins_router, prefix=API_PREFIX)
    app.include_router(chat_router, prefix=API_PREFIX)
    app.include_router(scheduler_router, prefix=API_PREFIX)
    app.include_router(gateway_router, prefix=API_PREFIX)
    app.include_router(auth_router, prefix=API_PREFIX)
    app.include_router(mcp_router, prefix=API_PREFIX)

    return app


app = create_app()
