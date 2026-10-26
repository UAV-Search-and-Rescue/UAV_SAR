export type BackendModel = {
  model_version: string;
  available: boolean;
  reason: string;
  modalities: string[];
};

export type ApiHealth = {
  status: "ok" | "degraded";
  service: string;
  mongodb: "connected" | "disconnected" | "disabled";
  models: BackendModel[];
};

export type DetectionBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Detection = {
  class_name: string;
  confidence: number;
  bbox: DetectionBox;
};

export type DetectionResponse = {
  request_id: string;
  timestamp: string;
  model_version: string;
  used_modalities: string[];
  detections: Detection[];
  alerts: { class_name: string; confidence: number; alert: boolean }[];
  latency_ms: number;
  result_saved: boolean;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isApiHealth(value: unknown): value is ApiHealth {
  return (
    isRecord(value) &&
    (value.status === "ok" || value.status === "degraded") &&
    typeof value.service === "string" &&
    (value.mongodb === "connected" || value.mongodb === "disconnected" || value.mongodb === "disabled") &&
    Array.isArray(value.models) &&
    value.models.every(
      (model) =>
        isRecord(model) &&
        typeof model.model_version === "string" &&
        typeof model.available === "boolean" &&
        typeof model.reason === "string" &&
        isStringArray(model.modalities),
    )
  );
}

function isDetection(value: unknown): value is Detection {
  if (
    !isRecord(value) ||
    typeof value.class_name !== "string" ||
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    !isRecord(value.bbox)
  ) {
    return false;
  }

  const bbox = value.bbox;
  return ["x1", "y1", "x2", "y2"].every(
    (coordinate) => typeof bbox[coordinate] === "number" && Number.isFinite(bbox[coordinate]),
  );
}

function isDetectionResponse(value: unknown): value is DetectionResponse {
  return (
    isRecord(value) &&
    typeof value.request_id === "string" &&
    typeof value.timestamp === "string" &&
    typeof value.model_version === "string" &&
    isStringArray(value.used_modalities) &&
    Array.isArray(value.detections) &&
    value.detections.every(isDetection) &&
    Array.isArray(value.alerts) &&
    typeof value.latency_ms === "number" &&
    Number.isFinite(value.latency_ms) &&
    typeof value.result_saved === "boolean"
  );
}

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

export async function getApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError("VITE_API_BASE_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/health`, { signal });
  if (!response.ok) {
    throw new ApiRequestError(`Backend health check failed (${response.status})`, response.status);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError("Backend health check returned invalid JSON", response.status);
  }
  if (!isApiHealth(body)) {
    throw new ApiRequestError("Backend health check returned an invalid response", response.status);
  }
  return body;
}

export async function postDetection(
  formData: FormData,
  signal?: AbortSignal,
): Promise<DetectionResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError("VITE_API_BASE_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/detect`, {
    method: "POST",
    body: formData,
    signal,
  });
  if (!response.ok) {
    let message = `Detection request failed (${response.status})`;
    try {
      const body: { detail?: unknown } = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new ApiRequestError(message, response.status);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError("Backend returned invalid JSON for the detection response", response.status);
  }
  if (!isDetectionResponse(body)) {
    throw new ApiRequestError("Backend returned an invalid detection response", response.status);
  }
  return body;
}
