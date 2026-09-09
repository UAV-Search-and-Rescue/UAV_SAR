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
    alerts: List[Alert] = Field(default_factory=list)
    latency_ms: float

class UAVMetadata(BaseModel):
    latitude: float
    longitude: float
    altitude_m: float


class CameraMetadata(BaseModel):
    focal_length_px: Optional[float] = None
    principal_point_x: Optional[float] = None
    principal_point_y: Optional[float] = None
    pitch_deg: Optional[float] = None
    roll_deg: Optional[float] = None
    yaw_deg: Optional[float] = None


class LocalizationRequest(BaseModel):
    uav: UAVMetadata
    camera: CameraMetadata

class TargetLocation(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude_m: Optional[float] = None
    estimated: bool = True

class Alert(BaseModel):
    class_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    alert: bool