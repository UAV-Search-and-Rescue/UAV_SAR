from io import BytesIO

from PIL import Image

from app.detectors.base import Detector


class E0Detector(Detector):

    async def predict(self, rgb, thermal=None):
        image_bytes = await rgb.read()

        if not image_bytes:
            raise ValueError("RGB image is empty")

        try:
            image = Image.open(BytesIO(image_bytes))
            image.load()
        except Exception as exc:
            raise ValueError("Invalid RGB image") from exc

        return []
