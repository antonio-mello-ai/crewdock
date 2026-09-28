from app.services.gateway.base import GatewayAdapter


class GatewayRegistry:
    """Registry for gateway adapters. Supports multiple gateways."""

    def __init__(self) -> None:
        self._gateways: dict[str, GatewayAdapter] = {}
        self._default: str | None = None

    def register(self, name: str, gateway: GatewayAdapter, *, default: bool = False) -> None:
        self._gateways[name] = gateway
        if default or self._default is None:
            self._default = name

    def get(self, name: str | None = None) -> GatewayAdapter:
        key = name or self._default
        if key is None or key not in self._gateways:
            raise ValueError(f"Gateway '{key}' not found. Available: {list(self._gateways)}")
        return self._gateways[key]

    @property
    def default(self) -> GatewayAdapter | None:
        if self._default is None:
            return None
        return self._gateways.get(self._default)

    def list_names(self) -> list[str]:
        return list(self._gateways.keys())


gateway_registry = GatewayRegistry()
