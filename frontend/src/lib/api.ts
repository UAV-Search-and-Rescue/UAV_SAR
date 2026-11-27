export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export type HealthResponse = {
  status: "ok" | "unhealthy" | string;
  service: string;
  mongodb: "connected" | "disconnected" | string;
};

export type BackendBoundingBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type BackendDetection = {
  class_name: string;
  confidence: number;
  bbox: BackendBoundingBox;
};

export type BackendAlert = {
  class_name: string;
  confidence: number;
  alert: boolean;
};

export type DetectionResponse = {
  request_id: string;
  timestamp: string;
  model_version: string;
  used_modalities: string[];
  detections: BackendDetection[];
  alerts: BackendAlert[];
  latency_ms: number;
};

export type ApiError = {
  status: number;
  message: string;
  detail?: string;
};

/**
 * Fetch system health status from FastAPI backend
 */
export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}

/**
 * Run real detection by uploading RGB (and optional thermal) image to FastAPI backend
 */
export async function runDetection(params: {
  rgb: File;
  modelVersion: string;
  thermal?: File | null;
}): Promise<DetectionResponse> {
  const form = new FormData();
  form.append("rgb", params.rgb, params.rgb.name);
  form.append("model_version", params.modelVersion);

  if (params.thermal) {
    form.append("thermal", params.thermal, params.thermal.name);
  }

  const response = await fetch(`${API_BASE_URL}/detect`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let errorDetail = `Detection request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse error
    }

    const error = new Error(errorDetail) as Error & ApiError;
    error.status = response.status;
    error.message = errorDetail;
    throw error;
  }

  return (await response.json()) as DetectionResponse;
}

/**
 * Retrieve saved detection result by request_id from MongoDB via FastAPI
 */
export async function getResult(requestId: string): Promise<DetectionResponse | null> {
  const response = await fetch(`${API_BASE_URL}/results/${encodeURIComponent(requestId)}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch result: HTTP ${response.status}`);
  }

  return (await response.json()) as DetectionResponse;
}

// ============================================================
// Live Session — Types
// ============================================================

export type LiveDetectionBbox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type LiveDetection = {
  detection_id: string;
  class_name: string;
  confidence: number;
  bbox: LiveDetectionBbox;
  timestamp: string;
  session_id: string;
  frame_number: number;
  video_time_seconds: number;
  latitude: number | null;
  longitude: number | null;
  crop_url: string;
  alert: boolean;
};

export type DroneConfig = {
  lat: number;
  lon: number;
  alt: number;
  yaw: number;
  pitch: number;
  roll: number;
  hfov: number;
  vfov: number;
};

export type LiveAlert = {
  alert_id: string;
  session_id: string;
  detection_id: string;
  priority: "High" | "Medium" | "Low";
  state: "open" | "acknowledged" | "resolved";
  headline: string;
  summary: string;
  detail: string;
  confidence: number;
  person_count: number;
  frame_number: number;
  video_time_seconds: number;
  bbox: LiveDetectionBbox;
  latitude: number | null;
  longitude: number | null;
  altitude: string;
  crop_url: string;
  timestamp: string;
};

export type LiveSessionStatus = {
  session_id: string;
  /** uploaded | running | paused | stopping | completed | stopped | error */
  status: string;
  rgb_name: string;
  thermal_name: string;
  thermal_auto?: boolean;
  rgb_fps: number;
  thermal_fps: number;
  duration_seconds: number;
  position_seconds: number;
  frame_number: number;
  total_frames: number;
  fps: number;
  detection_count: number;
  frame_detections: LiveDetection[];
  active_alerts: LiveDetection[];
  /** last 50 detections from session history */
  detections: LiveDetection[];
  alerts?: LiveAlert[];
  drone_config?: DroneConfig;
  gsd?: number | null;
  confidence_threshold: number;
  sync_policy: string;
  stream_url: string;
  thermal_stream_url: string;
  error: string;
  result_saved: boolean;
  storage_error: string;
};

// ============================================================
// Live Session — Internal helper
// ============================================================

async function _liveRequest(
  method: string,
  path: string,
  body?: object,
): Promise<LiveSessionStatus> {
  const opts: RequestInit = { method };
  if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, opts);
  if (!response.ok) {
    let detail = `Request failed: HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { detail?: unknown };
      if (json?.detail) {
        detail =
          typeof json.detail === "string"
            ? json.detail
            : JSON.stringify(json.detail);
      }
    } catch {
      /* ignore parse error */
    }
    throw new Error(detail);
  }
  return (await response.json()) as LiveSessionStatus;
}

// ============================================================
// Live Session — API functions
// ============================================================

/**
 * Upload an RGB+thermal video pair and create a new live-detection session.
 * Uses FormData — do NOT set Content-Type manually; the browser sets it with
 * the multipart boundary automatically.
 */
export async function uploadLiveVideos(
  rgb: File,
  thermal: File | null | undefined,
  confidenceThreshold: number,
): Promise<LiveSessionStatus> {
  const form = new FormData();
  form.append("rgb", rgb, rgb.name);
  if (thermal) {
    form.append("thermal", thermal, thermal.name);
  }
  form.append("confidence_threshold", String(confidenceThreshold));

  const response = await fetch(`${API_BASE_URL}/live-sessions`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let detail = `Upload failed: HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { detail?: unknown };
      if (json?.detail) {
        detail =
          typeof json.detail === "string"
            ? json.detail
            : JSON.stringify(json.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return (await response.json()) as LiveSessionStatus;
}

export function getLiveSession(id: string): Promise<LiveSessionStatus> {
  return _liveRequest("GET", `/live-sessions/${encodeURIComponent(id)}`);
}

export function startLiveSession(id: string): Promise<LiveSessionStatus> {
  return _liveRequest("POST", `/live-sessions/${encodeURIComponent(id)}/start`);
}

export function pauseLiveSession(id: string): Promise<LiveSessionStatus> {
  return _liveRequest("POST", `/live-sessions/${encodeURIComponent(id)}/pause`);
}

export function resumeLiveSession(id: string): Promise<LiveSessionStatus> {
  return _liveRequest(
    "POST",
    `/live-sessions/${encodeURIComponent(id)}/resume`,
  );
}

export function stopLiveSession(id: string): Promise<LiveSessionStatus> {
  return _liveRequest("POST", `/live-sessions/${encodeURIComponent(id)}/stop`);
}

export function seekLiveSession(
  id: string,
  positionSeconds: number,
): Promise<LiveSessionStatus> {
  return _liveRequest(
    "POST",
    `/live-sessions/${encodeURIComponent(id)}/seek`,
    { position_seconds: positionSeconds },
  );
}

export function setLiveThreshold(
  id: string,
  threshold: number,
): Promise<LiveSessionStatus> {
  return _liveRequest(
    "PATCH",
    `/live-sessions/${encodeURIComponent(id)}/threshold`,
    { confidence_threshold: threshold },
  );
}

export function updateLiveDroneConfig(
  id: string,
  config: Partial<DroneConfig>,
): Promise<LiveSessionStatus> {
  return _liveRequest(
    "POST",
    `/live-sessions/${encodeURIComponent(id)}/drone-config`,
    config,
  );
}

export type SampleFootageInfo = {
  available: boolean;
  rgb_name: string | null;
  thermal_name: string | null;
  message: string;
};

export type DetectedFrame = {
  frame_id: string;
  session_id: string;
  frame_number: number;
  video_time_seconds: number;
  timestamp: string;
  person_count: number;
  top_confidence: number;
  detections: LiveDetection[];
  rgb_frame_url: string;
  thermal_frame_url: string;
  inference_ms: number;
  model: string;
};

export async function resetAllLiveData(): Promise<void> {
  await fetch(`${API_BASE_URL}/live-sessions/reset-all`, { method: "POST" });
}

export async function getDetectedFrames(): Promise<DetectedFrame[]> {
  const response = await fetch(`${API_BASE_URL}/live-sessions/detected-frames`);
  if (!response.ok) return [];
  const data = (await response.json()) as { frames?: DetectedFrame[] };
  return data.frames ?? [];
}

export async function uploadLiveImages(
  rgbImages: File[],
  thermalImages: File[] | null | undefined,
  confidenceThreshold: number,
  fps = 2.0,
): Promise<LiveSessionStatus> {
  const form = new FormData();
  for (const file of rgbImages) {
    form.append("rgb_images", file, file.name);
  }
  if (thermalImages && thermalImages.length > 0) {
    for (const file of thermalImages) {
      form.append("thermal_images", file, file.name);
    }
  }
  form.append("fps", String(fps));
  form.append("confidence_threshold", String(confidenceThreshold));

  const response = await fetch(`${API_BASE_URL}/live-sessions/images`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    let detail = `Upload failed: HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { detail?: unknown };
      if (json?.detail) {
        detail = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
      }
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return (await response.json()) as LiveSessionStatus;
}

export async function getSampleFootageInfo(): Promise<SampleFootageInfo> {
  const response = await fetch(`${API_BASE_URL}/live-sessions/sample`);
  if (!response.ok) {
    return {
      available: false,
      rgb_name: null,
      thermal_name: null,
      message: "Sample footage status unavailable.",
    };
  }
  return (await response.json()) as SampleFootageInfo;
}

export function loadSampleFootageSession(
  confidenceThreshold: number,
): Promise<LiveSessionStatus> {
  return _liveRequest("POST", "/live-sessions/sample", {
    confidence_threshold: confidenceThreshold,
  });
}

export async function getLiveAlerts(): Promise<LiveAlert[]> {
  const response = await fetch(`${API_BASE_URL}/live-sessions/alerts`);
  if (!response.ok) return [];
  const data = (await response.json()) as { alerts?: LiveAlert[] };
  return data.alerts ?? [];
}

export async function updateLiveAlertState(
  alertId: string,
  state: "open" | "acknowledged" | "resolved",
): Promise<LiveAlert> {
  const response = await fetch(
    `${API_BASE_URL}/live-sessions/alerts/${encodeURIComponent(alertId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as LiveAlert;
}

/**
 * Full URL for the annotated-RGB MJPEG stream.
 * No auth header required (backend has no auth). Use directly as <img src>.
 */
export function liveStreamUrl(id: string): string {
  return `${API_BASE_URL}/live-sessions/${encodeURIComponent(id)}/stream`;
}

/** Full URL for the thermal MJPEG stream. Use directly as <img src>. */
export function liveThermalStreamUrl(id: string): string {
  return `${API_BASE_URL}/live-sessions/${encodeURIComponent(id)}/thermal-stream`;
}
