from fastapi import APIRouter

from app.core.config import settings
from app.services.llm_service import MODEL_MAP

router = APIRouter(tags=["health"])

MODEL_INFO: dict[str, dict[str, str]] = {
    "claude-sonnet-4-6": {
        "label": "Claude Sonnet 4.6",
        "description": "Fast and affordable",
        "provider": "anthropic",
    },
    "claude-opus-4-6": {
        "label": "Claude Opus 4.6",
        "description": "Most capable",
        "provider": "anthropic",
    },
    "claude-haiku-4-5": {
        "label": "Claude Haiku 4.5",
        "description": "Fastest and cheapest",
        "provider": "anthropic",
    },
}


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "version": settings.app_version}


@router.get("/models")
async def list_models() -> list[dict[str, str]]:
    """List available LLM models based on configured API keys."""
    models: list[dict[str, str]] = []

    if settings.anthropic_api_key:
        for model_id, info in MODEL_INFO.items():
            if model_id in MODEL_MAP:
                models.append({"id": model_id, **info})

    return models
