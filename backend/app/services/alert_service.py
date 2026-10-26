from app.config.settings import CONFIDENCE_THRESHOLD
from app.models.schemas import Alert


def evaluate_alerts(detections):
    alerts = []

    for detection in detections:
        if detection.confidence >= CONFIDENCE_THRESHOLD:
            alerts.append(
                Alert(
                    class_name=detection.class_name,
                    confidence=detection.confidence,
                    alert=True
                )
            )

    return alerts