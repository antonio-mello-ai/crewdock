from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_openapi_schema_available() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "AI Platform"
    assert "/api/v1/agents" in schema["paths"]
    assert "/api/v1/tasks" in schema["paths"]
    assert "/api/v1/activity" in schema["paths"]
    assert "/api/v1/health" in schema["paths"]


def test_openapi_agents_crud_operations() -> None:
    response = client.get("/openapi.json")
    schema = response.json()
    agents_path = schema["paths"]["/api/v1/agents"]
    assert "get" in agents_path
    assert "post" in agents_path

    agent_detail = schema["paths"]["/api/v1/agents/{agent_id}"]
    assert "get" in agent_detail
    assert "patch" in agent_detail
    assert "delete" in agent_detail


def test_openapi_tasks_crud_operations() -> None:
    response = client.get("/openapi.json")
    schema = response.json()
    tasks_path = schema["paths"]["/api/v1/tasks"]
    assert "get" in tasks_path
    assert "post" in tasks_path
