from fastapi import APIRouter, HTTPException

from app.models.schemas import DetectionRequest, DetectionResponse
from app.services.detection_service import run_detection


router = APIRouter()

@router.post("/detect", response_model=DetectionResponse)
def detect(request: DetectionRequest):
    try:
        return run_detection(request)
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc)
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )
