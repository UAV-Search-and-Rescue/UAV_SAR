from app.detectors.base import Detector


class E0Detector(Detector):

    def predict(self, rgb, thermal=None):
        raise NotImplementedError(
            "E0 RGB detector inference is not connected yet."
        )
