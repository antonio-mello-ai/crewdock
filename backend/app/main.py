from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.activity import router as activity_router
from app.api.agents import router as agents_router
from app.api.health import router as health_router
from app.api.tasks import router as tasks_router
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
        allow_origins=["http://localhost:3001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix=API_PREFIX)
    app.include_router(agents_router, prefix=API_PREFIX)
    app.include_router(tasks_router, prefix=API_PREFIX)
    app.include_router(activity_router, prefix=API_PREFIX)

    return app


app = create_app()
