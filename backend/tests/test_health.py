
from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["service"] == "uav-search-and-rescue-backend"
    assert response.json()["status"] in {"ok", "unhealthy"}
    assert response.json()["mongodb"] in {"connected", "disconnected"}
