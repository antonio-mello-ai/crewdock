import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import verify_token
from app.schemas.knowledge import DocumentResponse, SearchRequest, SearchResponse
from app.services.qmd_client import qmd_client

logger = logging.getLogger(__name__)


def _check_qmd_configured() -> None:
    if not settings.qmd_base_url:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Knowledge base not configured. Set QMD_BASE_URL in .env",
        )


router = APIRouter(prefix="/knowledge", tags=["knowledge"], dependencies=[Depends(verify_token)])


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    _check_qmd_configured()
    try:
        data = await qmd_client.search(
            request.query,
            collection=request.collection,
            limit=request.limit,
            min_score=request.min_score,
        )
        return SearchResponse(results=data.get("results", []))
    except Exception as e:
        logger.warning("QMD search failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Knowledge base unavailable",
        ) from e


@router.post("/vector_search", response_model=SearchResponse)
async def vector_search(request: SearchRequest) -> SearchResponse:
    _check_qmd_configured()
    try:
        data = await qmd_client.vector_search(
            request.query,
            collection=request.collection,
            limit=request.limit,
            min_score=request.min_score if request.min_score > 0 else 0.3,
        )
        return SearchResponse(results=data.get("results", []))
    except Exception as e:
        logger.warning("QMD vector search failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Knowledge base unavailable",
        ) from e


@router.post("/deep_search", response_model=SearchResponse)
async def deep_search(request: SearchRequest) -> SearchResponse:
    _check_qmd_configured()
    try:
        data = await qmd_client.deep_search(
            request.query,
            collection=request.collection,
            limit=request.limit,
            min_score=request.min_score,
        )
        return SearchResponse(results=data.get("results", []))
    except Exception as e:
        logger.warning("QMD deep search failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Knowledge base unavailable",
        ) from e


@router.get("/doc/{doc_path:path}", response_model=DocumentResponse)
async def get_document(doc_path: str) -> DocumentResponse:
    _check_qmd_configured()
    try:
        data = await qmd_client.get(doc_path)
        return DocumentResponse(
            file=data.get("file", ""),
            content=data.get("content", ""),
            context=data.get("context"),
        )
    except Exception as e:
        logger.warning("QMD get document failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Knowledge base unavailable",
        ) from e
