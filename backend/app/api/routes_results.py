
from fastapi import APIRouter, HTTPException
from pymongo.errors import PyMongoError

from app.storage.result_store import MongoDBResultStore


router = APIRouter()

result_store = MongoDBResultStore()


@router.get("/results/{request_id}")
def get_result(request_id: str):
    try:
        result = result_store.get(request_id)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=503,
            detail="Result storage is temporarily unavailable",
        ) from exc

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Detection result not found",
        )

    return result
