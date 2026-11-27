# UAV Search and Rescue API

## Local startup

From PowerShell, start the API from the backend directory:

```powershell
Set-Location 'E:\MINI-PROJECT\5th sem\UAV_SAR-main\UAV_SAR\backend'
$env:E0_MODEL_PATH = 'D:\models\verified-e0-checkpoint.pt'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Set `E0_MODEL_PATH` only to a real checkpoint trained for the E0 detector. Install the Ultralytics version compatible with the training environment into this virtual environment before expecting E0 inference; Ultralytics is intentionally imported lazily and is not listed as a backend startup dependency. The backend starts without a checkpoint, but E0 is reported unavailable and `/detect` returns HTTP 503 rather than fabricated predictions.

The frontend is in `UAV_SAR-new\frontend`. Its `.env.development` points `VITE_API_BASE_URL` to `http://127.0.0.1:8000`. Start it in a second PowerShell window:

```powershell
Set-Location 'E:\MINI-PROJECT\5th sem\UAV_SAR-main\UAV_SAR-new\frontend'
npm run dev -- --host 127.0.0.1 --port 5173
```

Restart Vite after changing its environment file. The backend's `FRONTEND_ORIGINS` setting defaults to localhost and 127.0.0.1 on ports 5173 and 5174; override it with a comma-separated list when using another origin.

## Configuration

Backend settings are loaded from `backend\.env` and can be overridden by process environment variables:

| Variable | Purpose |
| --- | --- |
| `E0_MODEL_PATH` | Path to the real E0 checkpoint. |
| `FRONTEND_ORIGINS` | Comma-separated allowed browser origins. |
| `MONGODB_URI` | Optional MongoDB connection string; leave empty to disable persistence. |
| `MONGODB_DATABASE` | Database name when MongoDB is configured. |

Do not put secrets in frontend environment variables. Only `VITE_API_BASE_URL` is required by the frontend.

## API contract

- `GET /health` reports API status, MongoDB status, and each model's availability and supported modalities.
- `POST /detect` accepts `multipart/form-data` with required `rgb`, required `model_version` (`E0`), and optional `thermal`. It also accepts `confidence_threshold` (0–1), `image_size` (32–2048), `iou_threshold` (>0–1), and `max_detections` (1–1000).
- A successful response contains `request_id`, `timestamp`, `model_version`, `used_modalities`, detections with class name, confidence, and pixel-coordinate `xyxy` boxes, alert metadata, measured `latency_ms`, and `result_saved`.
- `GET /results/{request_id}` retrieves a saved result when MongoDB persistence is configured.

Uploads must be valid JPG or PNG images no larger than 5 MB. Invalid inputs return HTTP 400 or 422; an unsupported model returns HTTP 422; an unavailable model/checkpoint returns HTTP 503. Empty detections are a successful response with an empty `detections` array.

## Model availability

The repository's E0 training notebook describes an RGB-only Ultralytics YOLOv8s baseline. No trained E0 checkpoint is included in this repository, so actual E0 inference requires the teammate-provided checkpoint and compatible Ultralytics dependencies. E0 accepts RGB; an optional thermal file is validated but is not used. E1 currently has no detector implementation or configured checkpoint and is rejected as unsupported. The API does not return demo detections.
