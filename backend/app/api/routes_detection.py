
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pymongo.errors import PyMongoError

from app.models.schemas import DetectionResponse
from app.services.detection_service import run_detection


router = APIRouter()


@router.post("/detect", response_model=DetectionResponse)
async def detect(
    rgb: UploadFile = File(...),
    model_version: str = Form(..., min_length=1),
    thermal: UploadFile | None = File(None),
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
        )

    except NotImplementedError as exc:
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
