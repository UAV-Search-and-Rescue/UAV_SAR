
from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["service"] == "uav-search-and-rescue-backend"
    assert response.json()["status"] in {"ok", "degraded"}
    assert response.json()["mongodb"] in {"connected", "disconnected", "disabled"}
    assert response.json()["models"]


def test_health_allows_frontend_origin_on_port_5174():
    with TestClient(app) as client:
        response = client.options(
            "/health",
            headers={
                "Origin": "http://127.0.0.1:5174",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5174"
