from fastapi import FastAPI

from app.api.routes_health import router as health_router


app = FastAPI(
    title="UAV Search and Rescue Backend",
    version="0.1.0"
)

app.include_router(health_router)