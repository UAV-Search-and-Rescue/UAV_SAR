import {
  Activity,
  AlertTriangle,
  Clock,
  Eye,
  Gauge,
  Layers,
  Pause,
  Play,
  RadioTower,
  RotateCcw,
  Square,
  Thermometer,
  Upload,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ConfBadge, EmptyState, Panel } from "../components/ui";
import {
  getLiveSession,
  liveStreamUrl,
  liveThermalStreamUrl,
  pauseLiveSession,
  resumeLiveSession,
  seekLiveSession,
  setLiveThreshold,
  startLiveSession,
  stopLiveSession,
  uploadLiveVideos,
  type LiveDetection,
  type LiveSessionStatus,
} from "../lib/api";
import { cn } from "../lib/cn";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const ALLOWED_EXT = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);
const MAX_BYTES = 500 * 1024 * 1024;
const POLL_INTERVAL_MS = 500;
const THRESHOLD_DEBOUNCE_MS = 400;

type DemoStep =
  | "idle"
  | "uploading"
  | "starting"
  | "running"
  | "paused"
  | "stopping"
  | "completed"
  | "stopped"
  | "error";

const ACTIVE_STEPS: DemoStep[] = ["running", "paused", "stopping"];
const TERMINAL_STEPS: DemoStep[] = ["completed", "stopped", "error"];

// ----------------------------------------------------------------
// Utility helpers
// ----------------------------------------------------------------

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusTone(status: string): { color: string; bg: string; border: string } {
  switch (status) {
    case "running":
      return {
        color: "var(--sar-green)",
        bg: "var(--sar-green-dim)",
        border: "rgba(34,197,94,0.25)",
      };
    case "paused":
      return {
        color: "var(--sar-amber)",
        bg: "var(--sar-amber-dim)",
        border: "rgba(245,158,11,0.25)",
      };
    case "completed":
      return {
        color: "var(--sar-teal)",
        bg: "var(--sar-teal-dim)",
        border: "var(--sar-teal-border)",
      };
    case "error":
      return {
        color: "var(--sar-red)",
        bg: "var(--sar-red-dim)",
        border: "rgba(239,68,68,0.25)",
      };
    case "stopped":
    case "stopping":
      return {
        color: "var(--sar-text-2)",
        bg: "rgba(100,116,139,0.12)",
        border: "rgba(100,116,139,0.20)",
      };
    default:
      return {
        color: "var(--sar-text-3)",
        bg: "rgba(100,116,139,0.08)",
        border: "rgba(100,116,139,0.15)",
      };
  }
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const { color, bg, border } = statusTone(status);
  const isLive = status === "running";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {isLive ? (
        <span
          className="sar-live-dot h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
      ) : (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PanelHeader({
  icon,
  title,
  right,
}: {
  icon: ReactNode;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="section-header justify-between">
      <div
        className="flex items-center gap-2"
        style={{ color: "var(--sar-text-1)" }}
      >
        {icon}
        <h2>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  unit,
}: {
  label: string;
  value: ReactNode;
  icon: typeof Activity;
  accent?: string;
  unit?: string;
}) {
  const Icon = icon;
  const color = accent ?? "var(--sar-teal)";
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "var(--sar-surface-2)",
        border: "1px solid var(--sar-border)",
      }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--sar-text-3)" }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="font-mono text-lg font-bold"
          style={{ color: "var(--sar-text-1)" }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="text-[10px]"
            style={{ color: "var(--sar-text-3)" }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function VideoDropZone({
  label,
  required,
  icon,
  accentKey,
  file,
  onFile,
  onClear,
  disabled,
}: {
  label: string;
  required?: boolean;
  icon: typeof Video;
  accentKey: "blue" | "amber";
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [over, setOver] = useState(false);
  const Icon = icon;
  const color =
    accentKey === "blue" ? "var(--sar-teal)" : "var(--sar-amber)";
  const bg =
    accentKey === "blue" ? "var(--sar-teal-dim)" : "var(--sar-amber-dim)";

  function acceptFile(f: File) {
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return;
    if (f.size > MAX_BYTES) return;
    onFile(f);
  }

  if (file) {
    return (
      <div>
        <div
          className="mb-1 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--sar-text-3)" }}
        >
          {label}
          {required && (
            <span style={{ color: "var(--sar-red)" }}> *</span>
          )}
        </div>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "var(--sar-surface-2)",
            border: `1px solid ${color}40`,
          }}
        >
          <Icon className="h-4 w-4 shrink-0" style={{ color }} />
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-xs font-medium"
              style={{ color: "var(--sar-text-1)" }}
            >
              {file.name}
            </div>
            <div
              className="text-[10px]"
              style={{ color: "var(--sar-text-3)" }}
            >
              {formatFileSize(file.size)}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              aria-label={`Remove ${label}`}
              onClick={onClear}
              className="shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
              style={{ color: "var(--sar-text-3)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="mb-1 text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--sar-text-3)" }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--sar-red)" }}> *</span>
        )}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) {
            const f = e.dataTransfer.files[0];
            if (f) acceptFile(f);
          }
        }}
        className={cn("upload-zone flex flex-col items-center gap-1.5 py-5 text-center", over && "drag-over")}
        style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}}
      >
        <div
          className="grid h-9 w-9 place-items-center rounded-xl"
          style={{ background: bg, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs" style={{ color: "var(--sar-text-2)" }}>
          Drop video or{" "}
          <label
            htmlFor={disabled ? undefined : inputId}
            className={cn(!disabled && "cursor-pointer underline")}
            style={{ color: disabled ? "inherit" : color }}
          >
            browse
          </label>
        </p>
        <p className="text-[10px]" style={{ color: "var(--sar-text-3)" }}>
          MP4 · MOV · AVI · MKV · WebM &mdash; max 500 MB
        </p>
        {!disabled && (
          <input
            id={inputId}
            type="file"
            accept=".mp4,.mov,.avi,.mkv,.webm,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) acceptFile(f);
              e.target.value = "";
            }}
          />
        )}
      </div>
    </div>
  );
}

function VideoFrame({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sar-panel overflow-hidden">
      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--sar-border)" }}
      >
        <div className="min-w-0">
          <div
            className="truncate text-xs font-semibold"
            style={{ color: "var(--sar-text-1)" }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              className="text-[10px]"
              style={{ color: "var(--sar-text-3)" }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {badge}
      </div>
      <div className="relative aspect-video overflow-hidden bg-black">
        {children}
      </div>
    </div>
  );
}

function FramePlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <Layers className="h-6 w-6" style={{ color: "var(--sar-text-3)" }} />
      <span className="text-center text-[11px]" style={{ color: "var(--sar-text-3)" }}>
        {message}
      </span>
    </div>
  );
}

function SpinningDot({ color }: { color: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <span
        className="sar-live-dot h-3 w-3 rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function DetectionRow({ det }: { det: LiveDetection }) {
  return (
    <tr
      style={{ borderBottom: "1px solid var(--sar-border)" }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background =
          "var(--sar-surface-2)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background = "")
      }
    >
      <td
        className="px-3 py-2 font-mono text-[11px]"
        style={{ color: "var(--sar-text-2)" }}
      >
        #{det.frame_number}
      </td>
      <td
        className="px-3 py-2 font-mono text-[11px]"
        style={{ color: "var(--sar-text-3)" }}
      >
        {det.video_time_seconds.toFixed(1)}s
      </td>
      <td className="px-3 py-2">
        <ConfBadge confidence={det.confidence} />
      </td>
      <td
        className="hidden px-3 py-2 font-mono text-[10px] sm:table-cell"
        style={{ color: "var(--sar-text-3)" }}
      >
        ({Math.round(det.bbox.x1)},{Math.round(det.bbox.y1)})&ndash;(
        {Math.round(det.bbox.x2)},{Math.round(det.bbox.y2)})
      </td>
      <td
        className="px-3 py-2 text-[11px]"
        style={{ color: "var(--sar-text-3)" }}
      >
        {det.latitude !== null
          ? `${det.latitude.toFixed(4)}, ${det.longitude!.toFixed(4)}`
          : "—"}
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------

export function DemoPage() {
  // File selections
  const [rgbFile, setRgbFile] = useState<File | null>(null);
  const [thermalFile, setThermalFile] = useState<File | null>(null);
  const [rgbPreviewUrl, setRgbPreviewUrl] = useState<string | null>(null);

  // Session lifecycle
  const [step, setStep] = useState<DemoStep>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<LiveSessionStatus | null>(null);
  const [error, setError] = useState("");

  // Seek & threshold
  const [threshold, setThreshold] = useState(0.5);
  const [seekDisplay, setSeekDisplay] = useState(0); // local value shown in slider
  const [thresholdPending, setThresholdPending] = useState(false);

  // Force MJPEG img remount when a new session starts
  const [streamKey, setStreamKey] = useState(0);

  // Refs (avoid stale closures in intervals)
  const isSeekingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;
  const pollingRef = useRef<number | null>(null);
  const thresholdDebounceRef = useRef<number | null>(null);
  const rgbPreviewUrlRef = useRef<string | null>(null);
  rgbPreviewUrlRef.current = rgbPreviewUrl;

  // ---- cleanup on unmount ----
  useEffect(() => {
    return () => {
      clearPolling();
      if (thresholdDebounceRef.current !== null) {
        window.clearTimeout(thresholdDebounceRef.current);
      }
      if (rgbPreviewUrlRef.current) {
        URL.revokeObjectURL(rgbPreviewUrlRef.current);
      }
    };
  }, []);

  // ---- polling helpers ----
  function clearPolling() {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function startPolling(id: string) {
    clearPolling();
    pollingRef.current = window.setInterval(async () => {
      if (sessionIdRef.current !== id) {
        clearPolling();
        return;
      }
      try {
        const status = await getLiveSession(id);
        setSessionStatus(status);
        if (!isSeekingRef.current) {
          setSeekDisplay(status.position_seconds);
        }
        const newStep = status.status as DemoStep;
        setStep(newStep);
        if (TERMINAL_STEPS.includes(newStep)) {
          clearPolling();
        }
      } catch {
        // transient error — keep polling
      }
    }, POLL_INTERVAL_MS);
  }

  // ---- file handlers ----
  function handleRgbFile(file: File | null) {
    // revoke previous preview URL
    if (rgbPreviewUrlRef.current) {
      URL.revokeObjectURL(rgbPreviewUrlRef.current);
    }
    setRgbFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setRgbPreviewUrl(url);
    } else {
      setRgbPreviewUrl(null);
    }
    setError("");
  }

  function handleThermalFile(file: File | null) {
    setThermalFile(file);
    setError("");
  }

  // ---- session lifecycle ----
  async function handleStart() {
    if (!rgbFile || !thermalFile) {
      setError("Upload both an RGB video and a thermal video before starting.");
      return;
    }
    setError("");
    setStep("uploading");
    try {
      const created = await uploadLiveVideos(rgbFile, thermalFile, threshold);
      setSessionId(created.session_id);
      setSessionStatus(created);
      setSeekDisplay(0);
      setStep("starting");

      const started = await startLiveSession(created.session_id);
      setSessionStatus(started);
      setStep("running");
      setStreamKey((k) => k + 1); // force MJPEG img remount
      startPolling(created.session_id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start demo session";
      setError(msg);
      setStep("error");
    }
  }

  async function handlePause() {
    if (!sessionId) return;
    try {
      const status = await pauseLiveSession(sessionId);
      setSessionStatus(status);
      setStep("paused");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause");
    }
  }

  async function handleResume() {
    if (!sessionId) return;
    try {
      const status = await resumeLiveSession(sessionId);
      setSessionStatus(status);
      setStep("running");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume");
    }
  }

  async function handleStop() {
    if (!sessionId) return;
    clearPolling();
    setStep("stopping");
    try {
      const status = await stopLiveSession(sessionId);
      setSessionStatus(status);
      setStep("stopped");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop session");
      setStep("error");
    }
  }

  function handleReset() {
    clearPolling();
    if (thresholdDebounceRef.current !== null) {
      window.clearTimeout(thresholdDebounceRef.current);
    }
    if (rgbPreviewUrlRef.current) {
      URL.revokeObjectURL(rgbPreviewUrlRef.current);
    }
    setRgbFile(null);
    setThermalFile(null);
    setRgbPreviewUrl(null);
    setSessionId(null);
    setSessionStatus(null);
    setStep("idle");
    setError("");
    setSeekDisplay(0);
    setThreshold(0.5);
    setThresholdPending(false);
  }

  async function handleSeekCommit(value: number) {
    isSeekingRef.current = false;
    if (!sessionId || !ACTIVE_STEPS.includes(step)) return;
    try {
      await seekLiveSession(sessionId, value);
    } catch {
      // non-critical — continue
    }
  }

  function handleThresholdChange(value: number) {
    setThreshold(value);
    if (!sessionId || !ACTIVE_STEPS.includes(step)) return;
    if (thresholdDebounceRef.current !== null) {
      window.clearTimeout(thresholdDebounceRef.current);
    }
    setThresholdPending(true);
    thresholdDebounceRef.current = window.setTimeout(async () => {
      try {
        await setLiveThreshold(sessionIdRef.current!, value);
      } catch {
        // non-critical
      } finally {
        setThresholdPending(false);
      }
    }, THRESHOLD_DEBOUNCE_MS);
  }

  // ---- derived state ----
  const isIdle = step === "idle";
  const isBusy = step === "uploading" || step === "starting";
  const isActive = ACTIVE_STEPS.includes(step);
  const isDone = TERMINAL_STEPS.includes(step);
  const showStream =
    !!sessionId &&
    (ACTIVE_STEPS.includes(step) ||
      TERMINAL_STEPS.includes(step));

  const fps = sessionStatus?.fps ?? 0;
  const totalDetections = sessionStatus?.detection_count ?? 0;
  const frameNumber = sessionStatus?.frame_number ?? 0;
  const totalFrames = sessionStatus?.total_frames ?? 0;
  const durationSec = sessionStatus?.duration_seconds ?? 0;
  const positionSec = sessionStatus?.position_seconds ?? 0;
  const progressPct =
    durationSec > 0 ? Math.min((positionSec / durationSec) * 100, 100) : 0;
  const alertCount = sessionStatus?.active_alerts?.length ?? 0;
  const latestDetections = sessionStatus?.detections ?? [];
  const hasGps = latestDetections.some((d) => d.latitude !== null);

  return (
    <div className="px-4 pb-10 sm:px-5">
      {/* ── Page header ── */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="flex items-center gap-2 text-2xl font-bold tracking-tight"
            style={{ color: "var(--sar-text-1)" }}
          >
            <RadioTower
              className="h-6 w-6 shrink-0"
              style={{ color: "var(--sar-teal)" }}
            />
            RGB-Thermal SAR Demo
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--sar-text-2)" }}>
            Upload synchronized RGB and thermal video · real-time person
            detection with the RGBT fusion ONNX model
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {sessionStatus && <StatusPill status={sessionStatus.status} />}
          {error && !sessionStatus && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                background: "var(--sar-red-dim)",
                color: "var(--sar-red)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <AlertTriangle className="h-3 w-3" /> Error
            </span>
          )}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        {/* ═══════════════════════════════════════
            LEFT COLUMN — Upload · Controls · Stats
            ═══════════════════════════════════════ */}
        <div className="space-y-4 lg:col-span-4">

          {/* ── Upload panel ── */}
          <Panel>
            <PanelHeader
              icon={<Upload className="h-4 w-4" />}
              title="Video Input"
              right={
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--sar-text-3)" }}
                >
                  Step 1
                </span>
              }
            />
            <div className="space-y-3 p-4">
              <VideoDropZone
                label="RGB Video"
                required
                icon={Video}
                accentKey="blue"
                file={rgbFile}
                onFile={handleRgbFile}
                onClear={() => handleRgbFile(null)}
                disabled={!isIdle}
              />
              <VideoDropZone
                label="Thermal Video"
                required
                icon={Thermometer}
                accentKey="amber"
                file={thermalFile}
                onFile={handleThermalFile}
                onClear={() => { setThermalFile(null); setError(""); }}
                disabled={!isIdle}
              />

              {/* Confidence threshold */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "var(--sar-text-3)" }}
                  >
                    Confidence Threshold
                  </span>
                  <span
                    className="rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold"
                    style={{
                      background: "var(--sar-teal-dim)",
                      color: "var(--sar-teal)",
                    }}
                  >
                    {threshold.toFixed(2)}
                    {thresholdPending && (
                      <span style={{ color: "var(--sar-text-3)" }}> ·</span>
                    )}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.01}
                  value={threshold}
                  aria-label="Confidence threshold"
                  onChange={(e) =>
                    handleThresholdChange(Number(e.target.value))
                  }
                  className="w-full"
                />
                <div
                  className="mt-0.5 flex justify-between text-[10px]"
                  style={{ color: "var(--sar-text-3)" }}
                >
                  <span>0.1 — low</span>
                  <span>high — 0.9</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* ── Controls panel ── */}
          <Panel>
            <PanelHeader
              icon={<Zap className="h-4 w-4" />}
              title="Controls"
              right={
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--sar-text-3)" }}
                >
                  Step 2
                </span>
              }
            />
            <div className="p-4">
              {/* Error banner */}
              {error && (
                <div
                  className="mb-3 flex items-start gap-2 rounded-lg p-3 text-xs"
                  style={{
                    background: "var(--sar-red-dim)",
                    color: "var(--sar-red)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* ─ IDLE: show Start button ─ */}
              {isIdle && (
                <button
                  id="demo-start-btn"
                  type="button"
                  onClick={handleStart}
                  disabled={!rgbFile || !thermalFile}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "var(--sar-teal)" }}
                  aria-label="Start RGB-Thermal demo"
                >
                  <Play className="h-4 w-4 fill-white" />
                  {!rgbFile || !thermalFile
                    ? "Upload both videos to start"
                    : "Start Demo"}
                </button>
              )}

              {/* ─ BUSY: spinner ─ */}
              {isBusy && (
                <div
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: "var(--sar-teal-dim)",
                    color: "var(--sar-teal)",
                  }}
                >
                  <span
                    className="sar-live-dot h-2 w-2 rounded-full"
                    style={{ background: "var(--sar-teal)" }}
                  />
                  {step === "uploading" ? "Uploading videos…" : "Starting session…"}
                </div>
              )}

              {/* ─ ACTIVE / DONE: control buttons ─ */}
              {(isActive || isDone) && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {step === "running" && (
                      <button
                        id="demo-pause-btn"
                        type="button"
                        onClick={handlePause}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium"
                        style={{
                          background: "var(--sar-amber-dim)",
                          color: "var(--sar-amber)",
                          border: "1px solid rgba(245,158,11,0.25)",
                        }}
                      >
                        <Pause className="h-4 w-4" /> Pause
                      </button>
                    )}
                    {step === "paused" && (
                      <button
                        id="demo-resume-btn"
                        type="button"
                        onClick={handleResume}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium"
                        style={{
                          background: "var(--sar-green-dim)",
                          color: "var(--sar-green)",
                          border: "1px solid rgba(34,197,94,0.25)",
                        }}
                      >
                        <Play className="h-4 w-4" /> Resume
                      </button>
                    )}
                    {isActive && step !== "stopping" && (
                      <button
                        id="demo-stop-btn"
                        type="button"
                        onClick={handleStop}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium"
                        style={{
                          background: "var(--sar-red-dim)",
                          color: "var(--sar-red)",
                          border: "1px solid rgba(239,68,68,0.25)",
                        }}
                      >
                        <Square className="h-4 w-4 fill-current" /> Stop
                      </button>
                    )}
                    {step === "stopping" && (
                      <div
                        className="col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg text-sm"
                        style={{ color: "var(--sar-text-3)" }}
                      >
                        <span
                          className="sar-live-dot h-2 w-2 rounded-full"
                          style={{ background: "var(--sar-text-3)" }}
                        />
                        Stopping…
                      </div>
                    )}
                  </div>

                  <button
                    id="demo-reset-btn"
                    type="button"
                    onClick={handleReset}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: "var(--sar-surface-2)",
                      color: "var(--sar-text-2)",
                      border: "1px solid var(--sar-border-2)",
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset / New Session
                  </button>
                </div>
              )}

              {/* ─ IDLE with files: quick clear ─ */}
              {isIdle && (rgbFile || thermalFile) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-xs"
                  style={{ color: "var(--sar-text-3)" }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear selection
                </button>
              )}

              {/* ─ Progress bar + seek slider ─ */}
              {sessionStatus && durationSec > 0 && (
                <div className="mt-4">
                  <div
                    className="mb-1.5 flex items-center justify-between text-[11px]"
                    style={{ color: "var(--sar-text-3)" }}
                  >
                    <span>
                      {formatDuration(isSeekingRef.current ? seekDisplay : positionSec)}
                    </span>
                    <span>{formatDuration(durationSec)}</span>
                  </div>
                  {/* progress track */}
                  <div
                    className="mb-2 h-1 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--sar-surface-3)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progressPct}%`,
                        background: "var(--sar-teal)",
                        transition: "width 0.4s linear",
                      }}
                    />
                  </div>
                  {/* seek slider — only when active */}
                  {isActive && step !== "stopping" && (
                    <input
                      type="range"
                      min={0}
                      max={durationSec}
                      step={0.1}
                      value={seekDisplay}
                      aria-label="Seek video position"
                      onMouseDown={() => {
                        isSeekingRef.current = true;
                      }}
                      onTouchStart={() => {
                        isSeekingRef.current = true;
                      }}
                      onChange={(e) =>
                        setSeekDisplay(Number(e.target.value))
                      }
                      onMouseUp={(e) =>
                        handleSeekCommit(
                          Number((e.target as HTMLInputElement).value),
                        )
                      }
                      onTouchEnd={(e) =>
                        handleSeekCommit(
                          Number((e.target as HTMLInputElement).value),
                        )
                      }
                      className="w-full"
                    />
                  )}
                </div>
              )}
            </div>
          </Panel>

          {/* ── Stats panel ── */}
          <Panel>
            <PanelHeader
              icon={<Activity className="h-4 w-4" />}
              title="Live Statistics"
            />
            <div className="grid grid-cols-2 gap-2 p-4">
              <StatCard
                label="FPS"
                value={
                  fps > 0
                    ? fps.toFixed(1)
                    : isActive
                    ? "…"
                    : "—"
                }
                icon={Gauge}
                accent="var(--sar-teal)"
              />
              <StatCard
                label="Detections"
                value={totalDetections}
                icon={Users}
                accent="var(--sar-blue)"
              />
              <StatCard
                label="Frame"
                value={
                  totalFrames > 0
                    ? `${frameNumber}/${totalFrames}`
                    : "—"
                }
                icon={Layers}
                accent="var(--sar-green)"
              />
              <StatCard
                label="Alerts"
                value={alertCount}
                icon={AlertTriangle}
                accent={
                  alertCount > 0
                    ? "var(--sar-red)"
                    : "var(--sar-text-3)"
                }
              />
              {/* Inference time is not exposed by the status API — show N/A */}
              <div className="col-span-2">
                <StatCard
                  label="Avg Inference"
                  value="N/A"
                  unit="not in status API"
                  icon={Clock}
                  accent="var(--sar-text-3)"
                />
              </div>
            </div>

            {/* Sync policy footnote */}
            {sessionStatus?.sync_policy && (
              <div className="px-4 pb-3">
                <details
                  className="text-[10px]"
                  style={{ color: "var(--sar-text-3)" }}
                >
                  <summary className="cursor-pointer select-none font-medium">
                    Frame sync policy
                  </summary>
                  <p className="mt-1 leading-5">{sessionStatus.sync_policy}</p>
                </details>
              </div>
            )}
          </Panel>
        </div>

        {/* ═══════════════════════════════════════
            RIGHT COLUMN — Video views · Detection feed
            ═══════════════════════════════════════ */}
        <div className="space-y-4 lg:col-span-8">

          {/* ── Three-panel video grid ── */}
          <div className="grid gap-3 sm:grid-cols-3">

            {/* Panel 1: RGB original */}
            <VideoFrame
              title="RGB Input"
              subtitle="Uploaded file"
              badge={
                rgbFile ? (
                  <span
                    className="badge-base badge-blue shrink-0"
                    aria-label="RGB file size"
                  >
                    {formatFileSize(rgbFile.size)}
                  </span>
                ) : undefined
              }
            >
              {rgbPreviewUrl ? (
                <video
                  src={rgbPreviewUrl}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                  aria-label="Uploaded RGB video preview"
                />
              ) : (
                <FramePlaceholder message="Upload an RGB video" />
              )}
            </VideoFrame>

            {/* Panel 2: Annotated RGB MJPEG stream */}
            <VideoFrame
              title="Detection Output"
              subtitle="Annotated RGB"
              badge={
                step === "running" ? (
                  <span className="badge-base badge-green shrink-0">
                    <span
                      className="sar-live-dot h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--sar-green)" }}
                    />
                    LIVE
                  </span>
                ) : step === "paused" ? (
                  <span className="badge-base badge-amber shrink-0">
                    Paused
                  </span>
                ) : isDone ? (
                  <span className="badge-base badge-muted shrink-0">
                    Done
                  </span>
                ) : undefined
              }
            >
              {showStream && sessionId ? (
                <img
                  key={`rgb-mjpeg-${streamKey}`}
                  src={liveStreamUrl(sessionId)}
                  alt="Annotated RGB MJPEG detection stream"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    // Stream ended — keep showing the last rendered frame (browser caches it)
                    // Setting display none would blank the view, so we just leave the img
                    (e.target as HTMLImageElement).title =
                      "Stream ended or unavailable";
                  }}
                />
              ) : isBusy ? (
                <SpinningDot color="var(--sar-teal)" />
              ) : (
                <FramePlaceholder message="Start demo to see annotated detections" />
              )}
            </VideoFrame>

            {/* Panel 3: Thermal MJPEG stream */}
            <VideoFrame
              title="Thermal View"
              subtitle="Infrared + bboxes"
              badge={
                step === "running" ? (
                  <span
                    className="badge-base shrink-0"
                    style={{
                      background: "var(--sar-amber-dim)",
                      color: "var(--sar-amber)",
                      border: "1px solid rgba(245,158,11,0.25)",
                    }}
                  >
                    <span
                      className="sar-live-dot h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--sar-amber)" }}
                    />
                    LIVE
                  </span>
                ) : isDone ? (
                  <span className="badge-base badge-muted shrink-0">
                    Done
                  </span>
                ) : undefined
              }
            >
              {showStream && sessionId ? (
                <img
                  key={`thermal-mjpeg-${streamKey}`}
                  src={liveThermalStreamUrl(sessionId)}
                  alt="Thermal MJPEG detection stream"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).title =
                      "Stream ended or unavailable";
                  }}
                />
              ) : isBusy ? (
                <SpinningDot color="var(--sar-amber)" />
              ) : (
                <FramePlaceholder message="Upload thermal video" />
              )}
            </VideoFrame>
          </div>

          {/* ── Detection feed ── */}
          <Panel>
            <PanelHeader
              icon={<Eye className="h-4 w-4" />}
              title="Detection Feed"
              right={
                latestDetections.length > 0 ? (
                  <span className="badge-base badge-teal">
                    {latestDetections.length} recent
                  </span>
                ) : undefined
              }
            />
            <div
              className="max-h-72 overflow-y-auto"
              aria-label="Detection history"
              aria-live="polite"
            >
              {latestDetections.length === 0 ? (
                <EmptyState
                  message={
                    isIdle
                      ? "Upload both videos and start the demo to see detections"
                      : isActive
                      ? "Waiting for first detection…"
                      : "No detections recorded in this session"
                  }
                />
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--sar-border)",
                        color: "var(--sar-text-3)",
                      }}
                    >
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">
                        Frame
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">
                        Time
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">
                        Conf.
                      </th>
                      <th className="hidden px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest sm:table-cell">
                        BBox (px)
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">
                        GPS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* newest first */}
                    {[...latestDetections]
                      .reverse()
                      .map((det) => (
                        <DetectionRow key={det.detection_id} det={det} />
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </Panel>

          {/* ── GPS panel (shown only when real coordinates exist) ── */}
          {hasGps && (
            <Panel>
              <PanelHeader
                icon={<Layers className="h-4 w-4" />}
                title="GPS Detections"
              />
              <div className="divide-y p-4" style={{ borderColor: "var(--sar-border)" }}>
                {latestDetections
                  .filter((d) => d.latitude !== null)
                  .slice(0, 15)
                  .map((d) => (
                    <div
                      key={d.detection_id}
                      className="flex items-center gap-3 py-2"
                    >
                      <ConfBadge confidence={d.confidence} />
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--sar-text-2)" }}
                      >
                        {d.latitude!.toFixed(6)}, {d.longitude!.toFixed(6)}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--sar-text-3)" }}
                      >
                        frame #{d.frame_number}
                      </span>
                    </div>
                  ))}
              </div>
            </Panel>
          )}

          {/* ── GPS unavailable notice (after session ends, no GPS) ── */}
          {isDone && !hasGps && (
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{
                background: "var(--sar-surface-2)",
                border: "1px solid var(--sar-border)",
                color: "var(--sar-text-3)",
              }}
            >
              GPS/Telemetry unavailable — the uploaded videos contain no
              embedded location data. No coordinates were fabricated.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
