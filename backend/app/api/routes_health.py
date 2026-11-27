
from fastapi import APIRouter
from pymongo.errors import PyMongoError

from app.config.settings import MONGODB_URI
from app.models.model_registry import get_model_status
from app.storage.mongodb import check_mongodb_connection

router = APIRouter()


@router.get("/health")
def health_check():
    mongodb = "disabled" if not MONGODB_URI else "connected"
    if MONGODB_URI:
        try:
            check_mongodb_connection()
        except PyMongoError:
            mongodb = "disconnected"
    return {
        "status": "degraded" if mongodb == "disconnected" else "ok",
        "service": "uav-search-and-rescue-backend",
        "mongodb": mongodb,
        "models": get_model_status(),
    }
