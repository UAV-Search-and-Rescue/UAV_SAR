
from app.config.settings import CONFIDENCE_THRESHOLD
from app.models.schemas import Alert

def evaluate_alerts(detections):
    alerts = []

    for detection in detections:

        # Support both dictionary and object-based detections.
        if isinstance(detection, dict):
            confidence = detection["confidence"]
            class_name = detection["class_name"]
        else:
            confidence = detection.confidence
            class_name = detection.class_name

        if confidence >= CONFIDENCE_THRESHOLD:
            alerts.append(
                Alert(
                    class_name=class_name,
                    confidence=confidence,
                    alert=True
                )
            )

    return alerts