from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_phase3_routers_registered() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]

    # Skills
    assert "/api/v1/skills" in paths
    assert "/api/v1/skills/{skill_id}" in paths

    # Approvals
    assert "/api/v1/approvals" in paths
    assert "/api/v1/approvals/{approval_id}/decide" in paths

    # Webhooks
    assert "/api/v1/webhooks" in paths
    assert "/api/v1/webhooks/{webhook_id}" in paths

    # Plugins
    assert "/api/v1/plugins" in paths
    assert "/api/v1/plugins/{plugin_id}" in paths
