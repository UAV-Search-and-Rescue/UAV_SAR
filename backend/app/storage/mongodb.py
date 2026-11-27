from pymongo import MongoClient
import certifi

from app.config.settings import MONGODB_URI, MONGODB_DATABASE


client = (
    MongoClient(
        MONGODB_URI,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=1000,
    )
    if MONGODB_URI
    else None
)

db = client[MONGODB_DATABASE] if client is not None else None


def check_mongodb_connection():
    if client is None:
        return False
    client.admin.command("ping")
    return True