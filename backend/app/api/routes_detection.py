from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.schemas import DetectionResponse
from app.services.detection_service import run_detection


router = APIRouter()


@router.post("/detect", response_model=DetectionResponse)
async def detect(
    rgb: UploadFile = File(...),
    model_version: str = Form(...),
    thermal: UploadFile | None = File(None)
):
    try:
        return await run_detection(
            rgb=rgb,
            thermal=thermal,
            model_version=model_version
        )
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
