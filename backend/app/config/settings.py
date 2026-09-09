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

CONFIDENCE_THRESHOLD = float(
    os.getenv(
        "CONFIDENCE_THRESHOLD",
        "0.5"
    )
)