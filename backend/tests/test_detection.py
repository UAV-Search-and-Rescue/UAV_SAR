
import asyncio
from io import BytesIO

from fastapi import UploadFile
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services import detection_service


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


def valid_png():
    image = BytesIO()
    Image.new("RGB", (2, 2), color="white").save(image, format="PNG")
    image.seek(0)
    return image


def test_detect_reports_missing_e0_checkpoint():
    with TestClient(app) as client:
        response = client.post(
            "/detect",
            data={"model_version": "E0"},
            files={"rgb": ("rgb.png", valid_png(), "image/png")},
        )

    assert response.status_code == 503
    assert "E0_MODEL_PATH" in response.json()["detail"]


def test_detect_rejects_unimplemented_e1_model():
    with TestClient(app) as client:
        response = client.post(
            "/detect",
            data={"model_version": "E1"},
            files={"rgb": ("rgb.png", valid_png(), "image/png")},
        )

    assert response.status_code == 422
    assert "Unsupported model version: E1" in response.json()["detail"]


def test_e0_does_not_report_thermal_input_as_used(monkeypatch):
    class StubDetector:
        async def predict(self, **_kwargs):
            return []

    class DisabledStore:
        enabled = False

    monkeypatch.setattr(detection_service, "get_detector", lambda _version: StubDetector())
    monkeypatch.setattr(detection_service, "result_store", DisabledStore())

    response = asyncio.run(
        detection_service.run_detection(
            rgb=UploadFile(file=BytesIO(b"rgb"), filename="rgb.png"),
            thermal=UploadFile(file=BytesIO(b"thermal"), filename="thermal.png"),
            model_version="E0",
            confidence_threshold=0.5,
            image_size=640,
            iou_threshold=0.45,
            max_detections=100,
        )
    )

    assert response.used_modalities == ["rgb"]
    assert response.detections == []
