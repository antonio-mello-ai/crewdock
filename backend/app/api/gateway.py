from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import verify_token
from app.services.gateway.registry import gateway_registry

router = APIRouter(prefix="/gateway", tags=["gateway"], dependencies=[Depends(verify_token)])


@router.get("/status")
async def gateway_status() -> dict[str, object]:
    """Get gateway connection status."""
    gw = gateway_registry.default
    connected = False

    if gw is not None:
        from app.services.gateway.openclaw import OpenClawGateway

        if isinstance(gw, OpenClawGateway):
            connected = gw.is_connected

    return {
        "type": "openclaw",
        "url": settings.gateway_url,
        "connected": connected,
        "gateways": gateway_registry.list_names(),
    }
