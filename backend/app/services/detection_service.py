from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from fastapi import UploadFile
from app.services.localization_service import localize_detections
from app.models.model_registry import get_detector
from app.models.schemas import DetectionResponse
from app.storage.result_store import MongoDBResultStore


result_store = MongoDBResultStore()


async def run_detection(
    rgb: UploadFile,
    thermal: UploadFile | None,
    model_version: str
) -> DetectionResponse:
    request_id = str(uuid4())
    start_time = perf_counter()

    detector = get_detector(model_version)

    detections = await detector.predict(
        rgb=rgb,
        thermal=thermal
    )
    detections = await localize_detections(
        detections=detections
    )

    latency_ms = (perf_counter() - start_time) * 1000

    used_modalities = ["rgb"]

    if thermal is not None:
        used_modalities.append("thermal")

    result = DetectionResponse(
        request_id=request_id,
        timestamp=datetime.now(timezone.utc),
        model_version=model_version,
        used_modalities=used_modalities,
        detections=detections,
        latency_ms=latency_ms
    )

    result_store.save(result)

    return result
