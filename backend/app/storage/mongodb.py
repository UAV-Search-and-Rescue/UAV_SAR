from pymongo import MongoClient

from app.config.settings import MONGODB_URI, MONGODB_DATABASE


client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000
)

db = client[MONGODB_DATABASE]


def check_mongodb_connection():
    client.admin.command("ping")
    return True