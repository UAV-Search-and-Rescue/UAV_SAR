from app.storage.mongodb import db


class MongoDBResultStore:

    def __init__(self):
        self.collection = db["detection_results"]

    def save(self, result):
        document = result.model_dump(mode="json")
        self.collection.insert_one(document)
        return result

    def get(self, request_id: str):
        document = self.collection.find_one(
            {"request_id": request_id},
            {"_id": 0}
        )
        return document
