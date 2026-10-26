from typing import Optional


async def localize_detections(
    detections,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    altitude_m: Optional[float] = None
):
    return detections