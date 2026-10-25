
from fastapi import APIRouter, status
from pymongo.errors import PyMongoError

from app.storage.mongodb import check_mongodb_connection


router = APIRouter()


@router.get("/health")
def health_check():
    try:
        check_mongodb_connection()
    except PyMongoError:
        return {
            "status": "unhealthy",
            "service": "uav-search-and-rescue-backend",
            "mongodb": "disconnected",
        }

    return {
        "status": "ok",
        "service": "uav-search-and-rescue-backend",
        "mongodb": "connected",
    }
