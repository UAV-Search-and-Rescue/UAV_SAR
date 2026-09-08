from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from app.models.model_registry import get_detector
from app.models.schemas import DetectionRequest, DetectionResponse
from app.storage.result_store import MongoDBResultStore


result_store = MongoDBResultStore()


def run_detection(request: DetectionRequest) -> DetectionResponse:
    request_id = str(uuid4())
    start_time = perf_counter()

    detector = get_detector(request.model_version)

    detections = detector.predict(
        rgb=request.image,
        thermal=request.thermal
    )

    latency_ms = (perf_counter() - start_time) * 1000

    used_modalities = [request.image.modality]

    if request.thermal is not None:
        used_modalities.append(request.thermal.modality)

    result = DetectionResponse(
        request_id=request_id,
        timestamp=datetime.now(timezone.utc),
        model_version=request.model_version,
        used_modalities=used_modalities,
        detections=detections,
        latency_ms=latency_ms
    )

    result_store.save(result)

    return result
