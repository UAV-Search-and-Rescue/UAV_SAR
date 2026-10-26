# UAV Search and Rescue — Backend

FastAPI backend for the UAV Search and Rescue (UAV_SAR) project. It provides API endpoints for health checks, image detection requests, and retrieval of stored detection results.

> **Current status:** The E0 detector validates uploaded RGB and optional thermal images but returns an empty detection list. Actual model inference, person detection, and RGB–thermal fusion are not yet integrated.

## 1. Overview

The backend provides the API and storage layer for UAV_SAR. It uses FastAPI for HTTP endpoints, Pydantic for response schemas, and MongoDB for persisting and retrieving detection results.

## 2. Features

- FastAPI application with Swagger documentation.
- Health check with MongoDB connectivity verification.
- Detection endpoint accepting RGB and optional thermal images.
- Image validation for empty, invalid, and oversized files.
- Detector selection through a model registry.
- Structured detection responses containing request ID, timestamp, model version, modalities, alerts, and latency.
- MongoDB persistence and result retrieval.
- Request-ID-aware logging.
- Automated tests for health, detection validation, and result errors.

## 3. Technology Stack

| Technology    | Purpose                     |
| ------------- | --------------------------- |
| Python        | Backend language            |
| FastAPI       | REST API framework          |
| Uvicorn       | ASGI server                 |
| Pydantic      | Data validation and schemas |
| PyMongo       | MongoDB access              |
| python-dotenv | Environment configuration   |
| Pillow        | Image validation            |
| certifi       | TLS certificates            |
| pytest        | Automated testing           |
| httpx         | HTTP testing client         |

Dependency versions are maintained in `requirements.txt`.

## 4. Project Structure

```text
backend/
├── app/
│   ├── api/
│   │   ├── routes_detection.py
│   │   ├── routes_health.py
│   │   └── routes_results.py
│   ├── config/
│   │   ├── logging_config.py
│   │   └── settings.py
│   ├── detectors/
│   │   ├── base.py
│   │   └── e0_rgb.py
│   ├── models/
│   │   ├── model_registry.py
│   │   └── schemas.py
│   ├── services/
│   │   ├── alert_service.py
│   │   ├── detection_service.py
│   │   └── localization_service.py
│   ├── storage/
│   │   ├── mongodb.py
│   │   └── result_store.py
│   └── main.py
├── tests/
│   ├── test_detection.py
│   ├── test_health.py
│   └── test_results.py
├── .env.example
├── requirements.txt
└── README.md
```

This shows the main components; additional files may exist in the repository.

## 5. Setup and Installation

Run these commands from the `backend` directory.

### Step 1: Create a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If you already have a working virtual environment, activate it rather than creating another one.

### Step 2: Install dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r .\requirements.txt
```

For automated testing, install the test dependencies if they are not already present:

```powershell
python -m pip install pytest httpx
```

### Step 3: Configure environment variables

Copy the example configuration:

```powershell
Copy-Item .\.env.example .\.env
```

Edit `.env` with the MongoDB URI and database name for your environment.

| Variable               | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `MONGODB_URI`          | MongoDB connection URI                                   |
| `MONGODB_DATABASE`     | Database used for detection results                      |
| `CONFIDENCE_THRESHOLD` | Confidence threshold; default `0.5`, valid range `0`–`1` |

Verify the exact supported variables and defaults in `app/config/settings.py` and `.env.example`.

**Security:** Never commit `.env`, expose database credentials, or put secrets directly in source code.

## 6. Run the API

With the virtual environment activated:

```powershell
python -m uvicorn app.main:app --reload
```

The development server normally runs at `http://127.0.0.1:8000`.

API documentation:

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
- OpenAPI schema: http://127.0.0.1:8000/openapi.json

Use `--reload` for local development, not production deployment.

## 7. API Endpoints

### 7.1 `GET /health`

Checks whether the backend can communicate with MongoDB.

Example response when connected:

```json
{
  "status": "ok",
  "service": "uav-search-and-rescue-backend",
  "mongodb": "connected"
}
```

If the MongoDB connectivity check raises a `PyMongoError`, the current implementation returns an unhealthy status and reports MongoDB as disconnected.

### 7.2 `POST /detect`

Submits an RGB image and optionally a thermal image.

**Content type:** `multipart/form-data`

| Field           | Type   | Required | Description                    |
| --------------- | ------ | -------- | ------------------------------ |
| `rgb`           | File   | Yes      | RGB image                      |
| `model_version` | String | Yes      | Registered detector identifier |
| `thermal`       | File   | No       | Optional thermal image         |

Example request:

```bash
curl -X POST "http://127.0.0.1:8000/detect" \
  -F "model_version=E0" \
  -F "rgb=@path/to/rgb-image.png" \
  -F "thermal=@path/to/thermal-image.png"
```

Replace the example file paths with real paths. Omit the thermal field when no thermal image is available.

The current E0 detector validates the uploaded images but returns no detections. Operational person detection and RGB–thermal fusion are not implemented yet.

The response schema is defined in `app/models/schemas.py`. A successful response includes fields such as:

- `request_id`
- `timestamp`
- `model_version`
- `used_modalities`
- `detections`
- `alerts`
- `latency_ms`

Expected error responses include:

- `400 Bad Request` — invalid input or unsupported detector version.
- `422 Unprocessable Entity` — request validation failure.
- `503 Service Unavailable` — storage unavailable or detector not implemented, as applicable.

### 7.3 `GET /results/{request_id}`

Retrieves a previously stored detection result.

Example:

```bash
curl "http://127.0.0.1:8000/results/YOUR_REQUEST_ID"
```

| Status | Meaning                    |
| ------ | -------------------------- |
| `200`  | Result found               |
| `404`  | Detection result not found |
| `503`  | Result storage unavailable |

Use a `request_id` returned by a successful detection request.

## 8. Automated Testing

Run the complete test suite from the `backend` directory:

```powershell
python -m pytest -v
```

Run individual test files:

```powershell
python -m pytest .\tests\test_health.py -v
python -m pytest .\tests\test_detection.py -v
python -m pytest .\tests\test_results.py -v
```

The current tests cover:

- Health endpoint response structure.
- Missing RGB image rejection.
- Invalid RGB image rejection.
- Missing result handling.
- MongoDB storage-error handling.

**Last verified result:** 5 tests passed. A Starlette `TestClient` deprecation warning was observed, but it did not cause a test failure. Rerun the suite after code or dependency changes.

## 9. MongoDB Storage

Detection results are stored in the `detection_results` collection.

- Pydantic responses are converted to JSON-compatible documents before insertion.
- Results are retrieved by `request_id`.
- MongoDB's internal `_id` field is omitted from retrieval responses.
- A unique index on `request_id` has been created in the development database. Ensure the index exists in other environments if uniqueness is required.

## 10. Logging and Error Handling

- Logging configuration is maintained in `app/config/logging_config.py`.
- Detection logs record request start, completion, latency, detection count, and failures.
- Request IDs help correlate log messages.
- The MongoDB client is closed during application shutdown.
- API routes translate expected failures into HTTP error responses.

Avoid logging credentials, uploaded image contents, or sensitive information.

## 11. Limitations and Next Steps

1. **Model integration:** E0 currently validates images and returns an empty detection list. Integrate the approved model implementation once the updated model files are available.
2. **RGB–thermal fusion:** Accepting a thermal image does not mean fusion inference is operational.
3. **Test coverage:** The current five tests cover basic endpoint behavior, not every validation, persistence, or inference scenario.
4. **Configuration:** Verify required environment variables and startup validation before deployment.
5. **Deployment hardening:** Configure production server settings, secret management, resource limits, and monitoring before public deployment.

## 12. Troubleshooting

### MongoDB reports disconnected

- Verify `MONGODB_URI` and `MONGODB_DATABASE`.
- Check MongoDB availability and network access.
- Verify credentials and TLS settings.
- Restart the API after changing `.env`.

### `ModuleNotFoundError` when starting the API

- Ensure the terminal is in the `backend` directory.
- Activate the intended virtual environment.
- Install dependencies with:

```powershell
python -m pip install -r .\requirements.txt
```

### Tests cannot import the application

Run the tests from the `backend` directory:

```powershell
python -m pytest -v
```

### `/detect` returns an empty `detections` list

This is expected with the current E0 placeholder. Actual model inference has not yet been integrated.

## 13. Development Guidelines

- Keep model-specific logic in the detector/model layer rather than API routes.
- Keep API schemas, tests, and documentation synchronized.
- Do not commit secrets, local virtual environments, generated datasets, or large model artifacts.
- Run the full test suite before committing backend changes.
