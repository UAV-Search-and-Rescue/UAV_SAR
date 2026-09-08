from app.detectors.base import Detector
from app.detectors.e0_rgb import E0Detector


_DETECTORS = {
    "E0": E0Detector,
}


def get_detector(model_version: str) -> Detector:
    detector_class = _DETECTORS.get(model_version)

    if detector_class is None:
        raise ValueError(
            f"Unsupported model version: {model_version}"
        )

    return detector_class()
