
from app.storage.mongodb import db


class MongoDBResultStore:
    def __init__(self):
        self.collection = db["detection_results"] if db is not None else None

    @property
    def enabled(self):
        return self.collection is not None

    def save(self, result):
        if self.collection is None:
            raise RuntimeError("MongoDB result storage is not configured")
        document = result.model_dump(mode="json")
        self.collection.insert_one(document)
        return result

    def get(self, request_id: str):
        if self.collection is None:
            raise RuntimeError("MongoDB result storage is not configured")
        return self.collection.find_one(
            {"request_id": request_id},
            {"_id": 0},
        )
