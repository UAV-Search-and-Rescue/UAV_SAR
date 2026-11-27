
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
import logging
from pymongo.errors import PyMongoError

from app.detectors.errors import ModelUnavailableError
from app.models.schemas import DetectionResponse
from app.models.model_registry import UnsupportedModelError
from app.services.detection_service import run_detection


router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/detect", response_model=DetectionResponse)
async def detect(
    rgb: UploadFile = File(...),
    model_version: str = Form(..., min_length=1),
    thermal: UploadFile | None = File(None),
    confidence_threshold: float = Form(0.5, ge=0.0, le=1.0),
    image_size: int = Form(640, ge=32, le=2048),
    iou_threshold: float = Form(0.45, gt=0.0, le=1.0),
    max_detections: int = Form(100, ge=1, le=1000),
):
    if not model_version.strip():
        raise HTTPException(
            status_code=422,
            detail="model_version must not be empty or whitespace",
        )

    model_version = model_version.strip()

    try:
        return await run_detection(
            rgb=rgb,
            thermal=thermal,
            model_version=model_version,
            confidence_threshold=confidence_threshold,
            image_size=image_size,
            iou_threshold=iou_threshold,
            max_detections=max_detections,
        )

    except UnsupportedModelError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except ModelUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except PyMongoError as exc:
        raise HTTPException(
            status_code=503,
            detail="Result storage is temporarily unavailable",
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Detection inference failed")
        raise HTTPException(
            status_code=500,
            detail="Detection inference failed",
        ) from exc
