from fastapi import APIRouter, HTTPException

from app.storage.result_store import MongoDBResultStore


router = APIRouter()

result_store = MongoDBResultStore()


@router.get("/results/{request_id}")
def get_result(request_id: str):
    result = result_store.get(request_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Detection result not found"
        )

    return result
