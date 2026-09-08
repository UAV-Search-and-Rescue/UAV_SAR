from fastapi import FastAPI

from app.api.routes_detection import router as detection_router
from app.api.routes_health import router as health_router
from app.api.routes_results import router as results_router


app = FastAPI(
    title="UAV Search and Rescue Backend",
    version="0.1.0"
)

app.include_router(health_router)
app.include_router(detection_router)
app.include_router(results_router)
