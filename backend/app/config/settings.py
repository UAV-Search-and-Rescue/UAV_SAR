import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)



APP_NAME = os.getenv(
    "APP_NAME",
    "UAV Search and Rescue Backend"
)

APP_VERSION = os.getenv(
    "APP_VERSION",
    "0.1.0"
)

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    ""
)

MONGODB_DATABASE = os.getenv(
    "MONGODB_DATABASE",
    "uav_sar"
)

E0_MODEL_PATH = os.getenv(
    "E0_MODEL_PATH",
    ""
)

RGBT_MODEL_PATH = os.getenv(
    "RGBT_MODEL_PATH",
    str(BASE_DIR / "weights" / "fusion_progressive_finetune.onnx"),
)

CONFIDENCE_THRESHOLD = float(
    os.getenv(
        "CONFIDENCE_THRESHOLD",
        "0.5"
    )
)
if not 0.0 <= CONFIDENCE_THRESHOLD <= 1.0:
    raise ValueError(
        "CONFIDENCE_THRESHOLD must be between 0.0 and 1.0."
    )

FRONTEND_ORIGINS = tuple(
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
)