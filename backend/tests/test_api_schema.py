from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_openapi_all_routers_registered() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema["paths"]

    # Core routers (Phase 1)
    assert "/api/v1/health" in paths
    assert "/api/v1/agents" in paths
    assert "/api/v1/tasks" in paths
    assert "/api/v1/activity" in paths

    # Phase 2 routers
    assert "/api/v1/costs" in paths
    assert "/api/v1/costs/summary/agents" in paths
    assert "/api/v1/costs/summary/period" in paths
    assert "/api/v1/knowledge/search" in paths
    assert "/api/v1/knowledge/vector_search" in paths
    assert "/api/v1/knowledge/deep_search" in paths
    assert "/api/v1/knowledge/doc/{doc_id}" in paths
    assert "/api/v1/events" in paths


def test_tasks_schema_has_scheduling_fields() -> None:
    response = client.get("/openapi.json")
    schema = response.json()
    task_response = schema["components"]["schemas"]["TaskResponse"]
    props = task_response["properties"]
    assert "is_recurring" in props
    assert "last_run_at" in props
    assert "next_run_at" in props
    assert "schedule" in props


def test_knowledge_search_endpoint_post() -> None:
    response = client.get("/openapi.json")
    schema = response.json()
    search_path = schema["paths"]["/api/v1/knowledge/search"]
    assert "post" in search_path


def test_events_endpoint_get() -> None:
    response = client.get("/openapi.json")
    schema = response.json()
    events_path = schema["paths"]["/api/v1/events"]
    assert "get" in events_path
