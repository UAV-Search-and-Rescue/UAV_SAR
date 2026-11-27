import time
import os
import tempfile

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.services import live_detection_service


def make_video(frame_count: int) -> bytes:
    temporary = tempfile.NamedTemporaryFile(suffix=".avi", delete=False)
    path = temporary.name
    temporary.close()
    writer = cv2.VideoWriter(
        path,
        cv2.VideoWriter_fourcc(*"MJPG"),
        5.0,
        (64, 64),
    )
    if not writer.isOpened():
        os.unlink(path)
        raise RuntimeError("OpenCV MJPG video writer is not available")
    try:
        for index in range(frame_count):
            writer.write(np.full((64, 64, 3), index * 10, dtype=np.uint8))
    finally:
        writer.release()
    try:
        with open(path, "rb") as video:
            return video.read()
    finally:
        os.unlink(path)


def upload_pair(client: TestClient, rgb_frames: int, thermal_frames: int):
    return client.post(
        "/live-sessions",
        files={
            "rgb": ("rgb.avi", make_video(rgb_frames), "video/x-msvideo"),
            "thermal": ("thermal.avi", make_video(thermal_frames), "video/x-msvideo"),
        },
    )


def test_live_session_upload_process_stream_and_history(monkeypatch):
    def fake_predict(self, rgb_array, thermal_array, **_kwargs):
        assert rgb_array.shape == (64, 64, 3)
        assert thermal_array.shape == (64, 64)
        return [
            {
                "class_name": "person",
                "confidence": 0.9,
                "bbox": {"x1": 8.0, "y1": 8.0, "x2": 32.0, "y2": 40.0},
            }
        ]

    monkeypatch.setattr(
        live_detection_service.RGBTFusionDetector,
        "predict_arrays",
        fake_predict,
    )
    with TestClient(app) as client:
        upload = upload_pair(client, 3, 3)
        assert upload.status_code == 201
        session_id = upload.json()["session_id"]

        started = client.post(f"/live-sessions/{session_id}/start")
        assert started.status_code == 200
        deadline = time.monotonic() + 5
        status = started.json()
        while status["status"] not in {"completed", "error"} and time.monotonic() < deadline:
            time.sleep(0.05)
            status = client.get(f"/live-sessions/{session_id}").json()

        assert status["status"] == "completed"
        assert status["frame_number"] == 3
        assert status["detection_count"] == 3
        assert status["detections"][0]["latitude"] is None

        history = client.get(f"/live-sessions/{session_id}/detections")
        assert history.status_code == 200
        assert len(history.json()["detections"]) == 3
        crop = client.get(history.json()["detections"][0]["crop_url"])
        assert crop.status_code == 200
        assert crop.headers["content-type"] == "image/jpeg"

        frame = client.get(f"/live-sessions/{session_id}/frame")
        assert frame.status_code == 200
        assert frame.headers["content-type"] == "image/jpeg"
        stream = client.get(f"/live-sessions/{session_id}/stream")
        assert stream.status_code == 200
        assert stream.headers["content-type"].startswith("multipart/x-mixed-replace")
        thermal_stream = client.get(f"/live-sessions/{session_id}/thermal-stream")
        assert thermal_stream.status_code == 200
        assert thermal_stream.headers["content-type"].startswith("multipart/x-mixed-replace")


def test_live_session_rejects_unpaired_video_durations():
    with TestClient(app) as client:
        response = upload_pair(client, 3, 20)
    assert response.status_code == 400
    assert "durations differ" in response.json()["detail"]


def test_live_session_routes_report_missing_session():
    with TestClient(app) as client:
        response = client.get("/live-sessions/not-a-session")
    assert response.status_code == 404
