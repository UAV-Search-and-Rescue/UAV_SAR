
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_detection import router as detection_router
from app.api.routes_health import router as health_router
from app.api.routes_live_detection import router as live_detection_router
from app.api.routes_results import router as results_router
from app.config.settings import FRONTEND_ORIGINS
from app.detectors.rgbt_fusion import initialize_rgbt_model
from app.storage.mongodb import client
from app.config.logging_config import configure_logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    available, reason = initialize_rgbt_model()
    if not available:
        logger.error("RGBT model unavailable: %s", reason)
    yield
    if client is not None:
        client.close()

configure_logging()


app = FastAPI(
    title="UAV Search and Rescue Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(FRONTEND_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(detection_router)
app.include_router(live_detection_router)
app.include_router(results_router)
