
from io import BytesIO

from fastapi.testclient import TestClient

from app.main import app


def test_detect_rejects_missing_rgb():
    with TestClient(app) as client:
        response = client.post(
            "/detect",
            data={"model_version": "E0"},
        )

    assert response.status_code == 422


def test_detect_rejects_invalid_image():
    invalid_image = BytesIO(b"not-an-image")

    with TestClient(app) as client:
        response = client.post(
            "/detect",
            data={"model_version": "E0"},
            files={
                "rgb": (
                    "invalid.png",
                    invalid_image,
                    "image/png",
                )
            },
        )

    assert response.status_code == 400
    assert "Invalid RGB image" in response.json()["detail"]
