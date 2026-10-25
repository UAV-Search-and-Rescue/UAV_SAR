
import logging
from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from fastapi import UploadFile

from app.models.model_registry import get_detector
from app.models.schemas import DetectionResponse
from app.services.alert_service import evaluate_alerts
from app.services.localization_service import localize_detections
from app.storage.result_store import MongoDBResultStore


logger = logging.getLogger(__name__)
result_store = MongoDBResultStore()


async def run_detection(
    rgb: UploadFile,
    thermal: UploadFile | None,
    model_version: str,
) -> DetectionResponse:
    request_id = str(uuid4())
    start_time = perf_counter()

    logger.info(
        "Detection request started",
        extra={
            "request_id": request_id,
            "model_version": model_version,
            "thermal_provided": thermal is not None,
        },
    )

    try:
        detector = get_detector(model_version)

        detections = await detector.predict(
            rgb=rgb,
            thermal=thermal,
        )

        detections = await localize_detections(
            detections=detections,
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
            alerts=evaluate_alerts(detections),
            latency_ms=latency_ms,
        )

        result_store.save(result)

        logger.info(
            "Detection request completed",
            extra={
                "request_id": request_id,
                "detection_count": len(detections),
                "latency_ms": round(latency_ms, 2),
            },
        )

        return result

    except Exception:
        logger.exception(
            "Detection request failed",
            extra={"request_id": request_id},
        )
        raise
