
from io import BytesIO

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.detectors.base import Detector


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

    async def predict(self, rgb, thermal=None):
        await validate_image(rgb, "RGB")

        if thermal is not None:
            await validate_image(thermal, "Thermal")

        # Model inference remains unimplemented.
        return []
