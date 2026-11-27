
from importlib.util import find_spec
from pathlib import Path

from app.detectors.base import Detector
from app.detectors.e0_rgb import E0Detector
from app.detectors.rgbt_fusion import RGBTFusionDetector, get_rgbt_model_status
from app.config.settings import E0_MODEL_PATH, RGBT_MODEL_PATH


class UnsupportedModelError(ValueError):
    pass


_DETECTORS = {
    "E0": E0Detector,
    "RGBT": RGBTFusionDetector,
}


def get_detector(model_version: str) -> Detector:
    detector_class = _DETECTORS.get(model_version)

    if detector_class is None:
        raise UnsupportedModelError(
            f"Unsupported model version: {model_version}"
        )

    return detector_class()


def get_model_status() -> list[dict[str, str | bool]]:
    if not E0_MODEL_PATH:
        e0 = {
            "model_version": "E0",
            "available": False,
            "reason": "E0_MODEL_PATH is not configured",
            "modalities": ["rgb"],
        }
    elif not Path(E0_MODEL_PATH).is_file():
        e0 = {
            "model_version": "E0",
            "available": False,
            "reason": f"E0_MODEL_PATH={E0_MODEL_PATH!r} does not point to a valid checkpoint file",
            "modalities": ["rgb"],
        }
    elif find_spec("ultralytics") is None:
        e0 = {
            "model_version": "E0",
            "available": False,
            "reason": f"E0_MODEL_PATH={E0_MODEL_PATH!r} is configured but Ultralytics is not installed",
            "modalities": ["rgb"],
        }
    else:
        e0 = {
            "model_version": "E0",
            "available": True,
            "reason": "",
            "modalities": ["rgb"],
        }

    if not RGBT_MODEL_PATH:
        rgbt = {
            "model_version": "RGBT",
            "available": False,
            "reason": "RGBT_MODEL_PATH is not configured",
            "modalities": ["rgb", "thermal"],
        }
    elif not Path(RGBT_MODEL_PATH).is_file():
        rgbt = {
            "model_version": "RGBT",
            "available": False,
            "reason": "RGBT ONNX checkpoint does not exist",
            "modalities": ["rgb", "thermal"],
        }
    elif find_spec("onnxruntime") is None:
        rgbt = {
            "model_version": "RGBT",
            "available": False,
            "reason": "ONNX Runtime is not installed",
            "modalities": ["rgb", "thermal"],
        }
    else:
        available, reason = get_rgbt_model_status()
        rgbt = {
            "model_version": "RGBT",
            "available": available,
            "reason": reason,
            "modalities": ["rgb", "thermal"],
        }

    return [
        e0,
        rgbt,
        {
            "model_version": "E1",
            "available": False,
            "reason": "No E1 detector implementation or checkpoint is configured",
            "modalities": [],
        },
    ]
