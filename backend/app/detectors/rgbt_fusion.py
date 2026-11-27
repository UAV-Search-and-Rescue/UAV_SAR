
from functools import lru_cache
from pathlib import Path
from threading import Lock

import cv2
import numpy as np
import onnxruntime as ort

from starlette.concurrency import run_in_threadpool

from app.detectors.base import Detector
from app.detectors.errors import ModelUnavailableError
from app.detectors.e0_rgb import validate_image
from app.config.settings import RGBT_MODEL_PATH


_MODEL_STATUS_LOCK = Lock()
_MODEL_LOAD_ERROR = ""
_MODEL_LOADED_PATH = ""


@lru_cache(maxsize=2)
def _load_session(model_path: str):
    options = ort.SessionOptions()
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    return ort.InferenceSession(
        model_path,
        sess_options=options,
        providers=["CPUExecutionProvider"],
    )


def initialize_rgbt_model() -> tuple[bool, str]:
    """Load and validate the configured ONNX model once at application startup."""
    global _MODEL_LOAD_ERROR, _MODEL_LOADED_PATH

    model_path = Path(RGBT_MODEL_PATH)
    if not RGBT_MODEL_PATH:
        reason = "RGBT_MODEL_PATH is not configured"
        with _MODEL_STATUS_LOCK:
            _MODEL_LOAD_ERROR = reason
            _MODEL_LOADED_PATH = ""
        return False, reason
    if not model_path.is_file():
        reason = "Configured RGBT ONNX model does not exist"
        with _MODEL_STATUS_LOCK:
            _MODEL_LOAD_ERROR = reason
            _MODEL_LOADED_PATH = ""
        return False, reason

    try:
        resolved_path = str(model_path.resolve())
        session = _load_session(resolved_path)
        inputs = {item.name: item.shape for item in session.get_inputs()}
        outputs = {item.name: item.shape for item in session.get_outputs()}
        if "rgb" not in inputs or "thermal" not in inputs or not outputs:
            raise ValueError("ONNX model inputs or outputs do not match the RGBT contract")
        if inputs["rgb"][1:] != [3, 640, 640] or inputs["thermal"][1:] != [3, 640, 640]:
            raise ValueError("ONNX model inputs must have shape [batch, 3, 640, 640]")
        output_shape = outputs.get("output")
        if (
            output_shape is None
            or len(output_shape) != 3
            or (isinstance(output_shape[1], int) and output_shape[1] != 5)
            or (isinstance(output_shape[2], int) and output_shape[2] != 8400)
        ):
            raise ValueError("ONNX output must have shape [batch, 5, 8400]")
    except Exception:
        reason = "Configured RGBT ONNX model is invalid or could not be loaded"
        with _MODEL_STATUS_LOCK:
            _MODEL_LOAD_ERROR = reason
            _MODEL_LOADED_PATH = ""
        return False, reason

    with _MODEL_STATUS_LOCK:
        _MODEL_LOAD_ERROR = ""
        _MODEL_LOADED_PATH = resolved_path
    return True, ""


def get_rgbt_model_status() -> tuple[bool, str]:
    if not RGBT_MODEL_PATH:
        return False, "RGBT_MODEL_PATH is not configured"
    if not Path(RGBT_MODEL_PATH).is_file():
        return False, "RGBT ONNX checkpoint does not exist"
    with _MODEL_STATUS_LOCK:
        if _MODEL_LOAD_ERROR:
            return False, _MODEL_LOAD_ERROR
        if _MODEL_LOADED_PATH != str(Path(RGBT_MODEL_PATH).resolve()):
            return False, "RGBT ONNX model has not been initialized"
    return True, ""


def _nms_numpy(boxes, scores, iou_threshold):
    if len(boxes) == 0:
        return np.array([], dtype=int)

    x1, y1, x2, y2 = boxes.T

    areas = (
        np.maximum(0, x2 - x1)
        * np.maximum(0, y2 - y1)
    )

    order = scores.argsort()[::-1]
    keep = []

    while order.size:
        i = order[0]
        keep.append(i)

        if order.size == 1:
            break

        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        intersection = (
            np.maximum(0, xx2 - xx1)
            * np.maximum(0, yy2 - yy1)
        )

        iou = intersection / (
            areas[i] + areas[order[1:]] - intersection + 1e-6
        )

        order = order[np.where(iou <= iou_threshold)[0] + 1]

    return np.asarray(keep, dtype=int)


def _postprocess(output, confidence_threshold, iou_threshold):
    # ONNX output shape: [1, 5, 8400]
    prediction = output[0]

    boxes = prediction[:4].T
    scores = prediction[4]

    mask = scores > confidence_threshold

    if not mask.any():
        return []

    boxes = boxes[mask]
    scores = scores[mask]

    # Convert xywh (center coordinates) to xyxy.
    x1 = boxes[:, 0] - boxes[:, 2] / 2
    y1 = boxes[:, 1] - boxes[:, 3] / 2
    x2 = boxes[:, 0] + boxes[:, 2] / 2
    y2 = boxes[:, 1] + boxes[:, 3] / 2

    xyxy = np.stack(
        [x1, y1, x2, y2],
        axis=1,
    )

    keep = _nms_numpy(
        xyxy,
        scores,
        iou_threshold,
    )

    return [
        (xyxy[i], float(scores[i]))
        for i in keep
    ]


class RGBTFusionDetector(Detector):

    def predict_arrays(
        self,
        rgb_array,
        thermal_array,
        confidence_threshold=0.5,
        iou_threshold=0.45,
        max_detections=100,
    ):
        model_path = Path(RGBT_MODEL_PATH)
        if not model_path.is_file():
            raise ModelUnavailableError(
                "Configured RGBT ONNX model does not exist"
            )
        available, reason = get_rgbt_model_status()
        if not available:
            raise ModelUnavailableError(reason)
        if rgb_array.ndim != 3 or rgb_array.shape[2] != 3:
            raise ValueError("RGB frame must have three color channels")
        if thermal_array.ndim != 2:
            raise ValueError("Thermal frame must be a grayscale image")

        return self._predict(
            str(model_path.resolve()),
            rgb_array,
            thermal_array,
            confidence_threshold,
            iou_threshold,
            max_detections,
        )

    async def predict(
        self,
        rgb,
        thermal=None,
        confidence_threshold=0.5,
        image_size=640,
        iou_threshold=0.45,
        max_detections=100,
    ):
        if thermal is None:
            raise ValueError(
                "Thermal image is required for RGBT fusion detection"
            )

        if image_size != 640:
            raise ValueError(
                "RGBT model requires image_size=640"
            )

        model_path = Path(RGBT_MODEL_PATH)

        if not model_path.is_file():
            raise ModelUnavailableError(
                "Configured RGBT ONNX model does not exist"
            )

        await validate_image(rgb, "RGB")
        await validate_image(thermal, "Thermal")

        try:
            from PIL import Image, UnidentifiedImageError
            from io import BytesIO

            with Image.open(BytesIO(await rgb.read())) as image:
                rgb_array = np.asarray(
                    image.convert("RGB")
                ).copy()

            with Image.open(BytesIO(await thermal.read())) as image:
                thermal_array = np.asarray(
                    image.convert("L")
                ).copy()

        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise ValueError(
                "Invalid RGB or thermal image"
            ) from exc

        return await run_in_threadpool(
            self._predict,
            str(model_path.resolve()),
            rgb_array,
            thermal_array,
            confidence_threshold,
            iou_threshold,
            max_detections,
        )

    @staticmethod
    def _predict(
        model_path,
        rgb_array,
        thermal_array,
        confidence_threshold,
        iou_threshold,
        max_detections,
    ):
        try:
            session = _load_session(model_path)

            # RGB preprocessing:
            # Resize -> CHW -> float32 -> normalize.
            rgb_resized = cv2.resize(
                rgb_array,
                (640, 640),
            )

            rgb_input = (
                rgb_resized.transpose(2, 0, 1)
                .astype(np.float32)[None] / 255.0
            )

            # Thermal preprocessing:
            # Grayscale -> resize -> normalize -> repeat 3 channels.
            thermal_resized = cv2.resize(
                thermal_array,
                (640, 640),
            )

            thermal_gray = (
                thermal_resized.astype(np.float32) / 255.0
            )

            thermal_input = np.repeat(
                thermal_gray[None, None, :, :],
                3,
                axis=1,
            )

            # ONNX inference.
            output = session.run(
                None,
                {
                    "rgb": rgb_input,
                    "thermal": thermal_input,
                },
            )[0]
            if output.shape != (1, 5, 8400):
                raise ValueError("RGBT ONNX output must have shape [1, 5, 8400]")
        except Exception as exc:
            raise ModelUnavailableError(
                "RGBT ONNX inference failed"
            ) from exc

        decoded = _postprocess(
            output,
            confidence_threshold,
            iou_threshold,
        )

        original_height, original_width = rgb_array.shape[:2]

        scale_x = original_width / 640
        scale_y = original_height / 640

        detections = []

        for box, confidence in decoded[:max_detections]:
            x1, y1, x2, y2 = box

            detections.append({
                "class_name": "person",
                "confidence": confidence,
                "bbox": {
                    "x1": float(np.clip(
                        x1 * scale_x,
                        0,
                        original_width,
                    )),
                    "y1": float(np.clip(
                        y1 * scale_y,
                        0,
                        original_height,
                    )),
                    "x2": float(np.clip(
                        x2 * scale_x,
                        0,
                        original_width,
                    )),
                    "y2": float(np.clip(
                        y2 * scale_y,
                        0,
                        original_height,
                    )),
                },
            })

        return detections
