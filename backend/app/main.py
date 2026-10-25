
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_detection import router as detection_router
from app.api.routes_health import router as health_router
from app.api.routes_results import router as results_router
from app.storage.mongodb import client
from app.config.logging_config import configure_logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client.close()

configure_logging()


app = FastAPI(
    title="UAV Search and Rescue Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(detection_router)
app.include_router(results_router)
