from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    class_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: BoundingBox


class ImageMetadata(BaseModel):
    image_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    width: Optional[int] = None
    height: Optional[int] = None
    modality: str = "rgb"


class DetectionRequest(BaseModel):
    model_version: str
    image: ImageMetadata
    thermal: Optional[ImageMetadata] = None


class DetectionResponse(BaseModel):
    request_id: str
    timestamp: datetime
    model_version: str
    used_modalities: List[str]
    detections: List[Detection]
    latency_ms: float
