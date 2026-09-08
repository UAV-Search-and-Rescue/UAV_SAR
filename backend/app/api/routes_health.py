from fastapi import APIRouter

from app.storage.mongodb import check_mongodb_connection


router = APIRouter()


@router.get("/health")
def health_check():
    mongodb_status = check_mongodb_connection()

    return {
        "status": "ok",
        "service": "uav-search-and-rescue-backend",
        "mongodb": "connected" if mongodb_status else "disconnected"
    }