
from functools import lru_cache
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from app.detectors.base import Detector
from app.detectors.errors import ModelUnavailableError
from app.config.settings import E0_MODEL_PATH


MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


async def validate_image(
    upload: UploadFile,
    modality: str,
) -> None:
    """Validate uploaded image size and content."""
    image_bytes = await upload.read(MAX_IMAGE_SIZE_BYTES + 1)

    if not image_bytes:
        raise ValueError(f"{modality} image is empty")

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError(
            f"{modality} image exceeds the 5 MB size limit"
        )

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError(f"Invalid {modality} image") from exc

    # Reset the file so downstream code can read it if needed.
    await upload.seek(0)


class E0Detector(Detector):

    async def predict(
        self,
        rgb: UploadFile,
        thermal: UploadFile | None = None,
        confidence_threshold: float = 0.5,
        image_size: int = 640,
        iou_threshold: float = 0.45,
        max_detections: int = 100,
    ):
        await validate_image(rgb, "RGB")

        if thermal is not None:
            await validate_image(thermal, "Thermal")

        if not E0_MODEL_PATH:
            raise ModelUnavailableError("E0_MODEL_PATH is not configured")

        checkpoint = Path(E0_MODEL_PATH)
        if not checkpoint.is_file():
            raise ModelUnavailableError(
                f"E0_MODEL_PATH={checkpoint!r} does not point to a valid checkpoint file"
            )

        try:
            with Image.open(BytesIO(await rgb.read())) as source:
                image = source.convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise ValueError("Invalid RGB image") from exc

        return await run_in_threadpool(
            self._predict,
            str(checkpoint.resolve()),
            image,
            confidence_threshold,
            image_size,
            iou_threshold,
            max_detections,
        )

    @staticmethod
    def _predict(
        checkpoint: str,
        image: Image.Image,
        confidence_threshold: float,
        image_size: int,
        iou_threshold: float,
        max_detections: int,
    ):
        try:
            model = _load_model(checkpoint)
        except ModuleNotFoundError as exc:
            raise ModelUnavailableError(
                f"E0_MODEL_PATH={checkpoint!r} is configured but the ultralytics inference dependency is not installed"
            ) from exc
        except Exception as exc:
            raise ModelUnavailableError(
                f"E0_MODEL_PATH={checkpoint!r} is configured but the checkpoint could not be loaded"
            ) from exc

        try:
            results = model.predict(
                source=image,
                conf=confidence_threshold,
                imgsz=image_size,
                iou=iou_threshold,
                max_det=max_detections,
                verbose=False,
            )
        except Exception as exc:
            raise RuntimeError("E0 inference failed") from exc

        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            names = result.names
            for coordinates, confidence, class_id in zip(
                boxes.xyxy.tolist(),
                boxes.conf.tolist(),
                boxes.cls.tolist(),
            ):
                class_index = int(class_id)
                class_name = names.get(class_index, str(class_index)) if isinstance(names, dict) else names[class_index]
                detections.append(
                    {
                        "class_name": class_name,
                        "confidence": float(confidence),
                        "bbox": {
                            "x1": float(coordinates[0]),
                            "y1": float(coordinates[1]),
                            "x2": float(coordinates[2]),
                            "y2": float(coordinates[3]),
                        },
                    }
                )

        return detections


@lru_cache(maxsize=2)
def _load_model(checkpoint: str):
    from ultralytics import YOLO

    return YOLO(checkpoint)
