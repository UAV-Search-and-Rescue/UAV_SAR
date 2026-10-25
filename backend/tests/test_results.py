
from fastapi.testclient import TestClient
from pymongo.errors import PyMongoError

from app.api import routes_results
from app.main import app


def test_get_result_not_found(monkeypatch):
    monkeypatch.setattr(
        routes_results.result_store,
        "get",
        lambda request_id: None,
    )

    with TestClient(app) as client:
        response = client.get("/results/missing-test-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Detection result not found"


def test_get_result_storage_unavailable(monkeypatch):
    def raise_storage_error(request_id):
        raise PyMongoError("Simulated database failure")

    monkeypatch.setattr(
        routes_results.result_store,
        "get",
        raise_storage_error,
    )

    with TestClient(app) as client:
        response = client.get("/results/test-id")

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Result storage is temporarily unavailable"
    )
