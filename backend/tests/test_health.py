from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_check_returns_version() -> None:
    response = client.get("/api/v1/health")
    data = response.json()
    assert data["version"] == "1.2.1"
