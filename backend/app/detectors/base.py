from abc import ABC, abstractmethod


class Detector(ABC):

    @abstractmethod
    async def predict(self, rgb, thermal=None):
        raise NotImplementedError
