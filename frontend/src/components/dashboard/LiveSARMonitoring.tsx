import {
  Activity,
  AlertTriangle,
  Eye,
  Flag,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Square,
  Thermometer,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveSession, type SessionStep } from "../../context/LiveSessionContext";
import { useUi } from "../../context/UiContext";
import { ConfBadge, EmptyState, Panel } from "../ui";
import {
  API_BASE_URL,
  liveStreamUrl,
  liveThermalStreamUrl,
  type LiveDetection,
} from "../../lib/api";
import { cn } from "../../lib/cn";

const ALLOWED_EXT = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);
const MAX_BYTES = 1000 * 1024 * 1024;

type FeedTab = "detection" | "thermal" | "rgb";
type RightTab = "detections" | "config" | "history";

const ACTIVE_STEPS: SessionStep[] = ["running", "paused", "stopping"];
const TERMINAL_STEPS: SessionStep[] = ["completed", "stopped", "error"];

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusTone(status: string) {
  switch (status) {
    case "running":
      return { color: "var(--sar-green)", bg: "var(--sar-green-dim)", border: "rgba(34,197,94,0.25)" };
    case "paused":
      return { color: "var(--sar-amber)", bg: "var(--sar-amber-dim)", border: "rgba(245,158,11,0.25)" };
    case "completed":
      return { color: "var(--sar-teal)", bg: "var(--sar-teal-dim)", border: "var(--sar-teal-border)" };
    case "error":
      return { color: "var(--sar-red)", bg: "var(--sar-red-dim)", border: "rgba(239,68,68,0.25)" };
    default:
      return { color: "var(--sar-text-2)", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.20)" };
  }
}

function CompactFilePicker({
  label,
  icon: Icon,
  accent,
  file,
  onFile,
  onClear,
  disabled,
}: {
  label: string;
  icon: typeof Video;
  accent: string;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  function acceptFile(f: File) {
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.has(ext) || f.size > MAX_BYTES) return;
    onFile(f);
  }

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)" }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
      {file ? (
        <>
          <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: "var(--sar-text-1)" }}>
            {file.name} <span className="text-[10px]" style={{ color: "var(--sar-text-3)" }}>({fmtSize(file.size)})</span>
          </span>
          {!disabled && (
            <button
              type="button"
              aria-label={`Remove ${label}`}
              onClick={onClear}
              className="shrink-0 rounded p-0.5 hover:opacity-75"
              style={{ color: "var(--sar-text-3)" }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </>
      ) : (
        <label
          htmlFor={disabled ? undefined : inputId}
          className={cn("min-w-0 flex-1 truncate text-xs", !disabled && "cursor-pointer")}
          style={{ color: "var(--sar-text-2)" }}
        >
          {label}
          {!disabled && (
            <input
              id={inputId}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ""; }}
            />
          )}
        </label>
      )}
    </div>
  );
}

function StatusPill({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
    >
      <span style={{ color: "var(--sar-text-3)" }}>{label}</span>
      <span className="font-mono" style={{ color: color ?? "var(--sar-text-1)" }}>{value}</span>
    </span>
  );
}

export function LiveSARMonitoring() {
  const navigate = useNavigate();
  const { pushToast } = useUi();
  const {
    inputMode,
    setInputMode,
    rgbFile,
    handleRgbFile,
    thermalFile,
    setThermalFile,
    rgbImages,
    setRgbImages,
    thermalImages,
    setThermalImages,
    rgbPreviewUrl,
    step,
    sessionId,
    sessionStatus,
    error,
    setError,
    threshold,
    seekDisplay,
    setSeekDisplay,
    thresholdPending,
    streamKey,
    isSeekingRef,
    droneLat,
    setDroneLat,
    droneLon,
    setDroneLon,
    droneAlt,
    setDroneAlt,
    droneYaw,
    setDroneYaw,
    sampleInfo,
    handleStart,
    handleLoadSample,
    handlePause,
    handleResume,
    handleStop,
    handleReset,
    handleSeekCommit,
    handleThresholdChange,
    applyDroneConfig,
  } = useLiveSession();

  const [feedTab, setFeedTab] = useState<FeedTab>("detection");
  const [rightTab, setRightTab] = useState<RightTab>("detections");

  const isIdle = step === "idle";
  const isBusy = step === "uploading" || step === "starting";
  const isActive = ACTIVE_STEPS.includes(step);
  const isDone = TERMINAL_STEPS.includes(step);
  const showStream = !!sessionId && (isActive || isDone);

  const fps = sessionStatus?.fps ?? 0;
  const frameNumber = sessionStatus?.frame_number ?? 0;
  const totalFrames = sessionStatus?.total_frames ?? 0;
  const durationSec = sessionStatus?.duration_seconds ?? 0;
  const positionSec = sessionStatus?.position_seconds ?? 0;
  const frameDetections = sessionStatus?.frame_detections ?? [];
  const latestDetections = sessionStatus?.detections ?? [];
  const sessionAlerts = sessionStatus?.alerts ?? [];
  const tone = statusTone(sessionStatus?.status ?? step);

  return (
    <Panel className="flex flex-col">
      {/* ── Top status bar ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--sar-border)" }}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: "var(--sar-teal)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>
            Live SAR Monitoring
          </h2>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", step === "running" && "sar-live-dot")}
              style={{ background: tone.color }}
            />
            {step === "idle" ? "Model Ready" : step.charAt(0).toUpperCase() + step.slice(1)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill label="FPS" value={fps > 0 ? fps.toFixed(1) : "—"} color="var(--sar-teal)" />
          <StatusPill label="Frame" value={totalFrames > 0 ? `${frameNumber}/${totalFrames}` : "—"} />
        </div>
      </div>

      {/* ── Main 2-column split ── */}
      <div className="grid gap-3 p-3 lg:grid-cols-12">

        {/* LEFT COLUMN (7/12): Instant Alert Banner + Live Video Viewport + Upload Bar + Playback Controls */}
        <div className="flex flex-col gap-2.5 lg:col-span-7">
          {frameDetections.length > 0 && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
              style={{ background: "var(--sar-red-dim)", color: "var(--sar-red)", border: "1px solid rgba(239,68,68,0.4)" }}
              role="alert"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  ALERT: {frameDetections.length} person(s) detected in Frame #{frameNumber} (Top:{" "}
                  {Math.round(Math.max(...frameDetections.map((d) => d.confidence)) * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/detection")}
                  className="rounded px-2 py-0.5 text-[11px] font-semibold underline"
                  style={{ color: "var(--sar-text-1)" }}
                >
                  Detection Page
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/alerts")}
                  className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
                  style={{ background: "var(--sar-red)" }}
                >
                  View Alerts
                </button>
              </div>
            </div>
          )}

          {/* Video viewport */}
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: "#05070c", border: "1px solid var(--sar-border)" }}
          >
            <div
              className="flex items-center justify-between px-3 py-1.5"
              style={{ background: "var(--sar-surface-2)", borderBottom: "1px solid var(--sar-border)" }}
            >
              <span className="text-[11px] font-semibold" style={{ color: "var(--sar-text-2)" }}>
                {feedTab === "detection"
                  ? "Live Detection Feed"
                  : feedTab === "thermal"
                  ? "Thermal Camera Feed"
                  : "RGB Camera Feed"}
              </span>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "detection", label: "Detection Feed" },
                    { id: "thermal", label: "Thermal Feed" },
                    { id: "rgb", label: "RGB Input" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFeedTab(tab.id)}
                    className="rounded px-2 py-0.5 text-[10px] font-semibold transition-colors"
                    style={{
                      background: feedTab === tab.id ? "var(--sar-teal-dim)" : "transparent",
                      color: feedTab === tab.id ? "var(--sar-teal)" : "var(--sar-text-3)",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {feedTab === "rgb" ? (
                rgbPreviewUrl ? (
                  <video src={rgbPreviewUrl} muted loop autoPlay playsInline className="h-full w-full object-contain" />
                ) : (
                  <EmptyFeed text="Upload an RGB video to preview" />
                )
              ) : feedTab === "thermal" ? (
                showStream && sessionId ? (
                  <img
                    key={`thr-${streamKey}`}
                    src={liveThermalStreamUrl(sessionId)}
                    alt="Thermal Camera Feed"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <EmptyFeed text="Thermal feed (or auto pseudo-thermal) starts with session" />
                )
              ) : showStream && sessionId ? (
                <img
                  key={`det-${streamKey}`}
                  src={liveStreamUrl(sessionId)}
                  alt="Live Detection Feed"
                  className="h-full w-full object-contain"
                />
              ) : isBusy ? (
                <div className="flex h-full w-full items-center justify-center gap-2 text-xs" style={{ color: "var(--sar-teal)" }}>
                  <span className="sar-live-dot h-2.5 w-2.5 rounded-full" style={{ background: "var(--sar-teal)" }} />
                  {step === "uploading" ? "Uploading…" : "Starting ONNX inference…"}
                </div>
              ) : (
                <EmptyFeed text="Upload an RGB video, select Dataset Images, or click Load Sample Footage" />
              )}
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
              style={{ background: "var(--sar-red-dim)", color: "var(--sar-red)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bottom Upload Bar */}
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl p-2"
            style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}
          >
            {isIdle && (
              <div className="flex rounded-lg p-0.5" style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)" }}>
                <button
                  type="button"
                  onClick={() => setInputMode("video")}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold"
                  style={{
                    background: inputMode === "video" ? "var(--sar-teal-dim)" : "transparent",
                    color: inputMode === "video" ? "var(--sar-teal)" : "var(--sar-text-3)",
                  }}
                >
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("images")}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold"
                  style={{
                    background: inputMode === "images" ? "var(--sar-teal-dim)" : "transparent",
                    color: inputMode === "images" ? "var(--sar-teal)" : "var(--sar-text-3)",
                  }}
                >
                  Dataset Images
                </button>
              </div>
            )}

            {inputMode === "video" ? (
              <>
                <CompactFilePicker
                  label="Choose RGB Video..."
                  icon={Video}
                  accent="var(--sar-teal)"
                  file={rgbFile}
                  onFile={handleRgbFile}
                  onClear={() => handleRgbFile(null)}
                  disabled={!isIdle}
                />
                <CompactFilePicker
                  label="Thermal (optional)..."
                  icon={Thermometer}
                  accent="var(--sar-amber)"
                  file={thermalFile}
                  onFile={(f) => { setThermalFile(f); setError(""); }}
                  onClear={() => { setThermalFile(null); setError(""); }}
                  disabled={!isIdle}
                />
              </>
            ) : (
              <>
                <label
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs"
                  style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
                >
                  <Video className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--sar-teal)" }} />
                  <span className="truncate">
                    {rgbImages.length > 0 ? `${rgbImages.length} RGB image(s)` : "Select RGB Images..."}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={!isIdle}
                    className="hidden"
                    onChange={(e) => {
                      setRgbImages(Array.from(e.target.files ?? []));
                      setError("");
                    }}
                  />
                </label>
                <label
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs"
                  style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
                >
                  <Thermometer className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--sar-amber)" }} />
                  <span className="truncate">
                    {thermalImages.length > 0 ? `${thermalImages.length} Thermal image(s)` : "Thermal Images (optional)..."}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={!isIdle}
                    className="hidden"
                    onChange={(e) => {
                      setThermalImages(Array.from(e.target.files ?? []));
                      setError("");
                    }}
                  />
                </label>
              </>
            )}

            {isIdle && (
              <>
                <button
                  id="sar-load-sample-btn"
                  type="button"
                  onClick={handleLoadSample}
                  disabled={!sampleInfo?.available}
                  title={sampleInfo?.message ?? "Load bundled sample footage"}
                  className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ background: "var(--sar-surface)", color: "var(--sar-teal)", border: "1px solid var(--sar-teal-border)" }}
                >
                  Load Sample Footage
                </button>
                <button
                  id="sar-start-btn"
                  type="button"
                  onClick={handleStart}
                  disabled={inputMode === "video" ? !rgbFile : rgbImages.length === 0}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "var(--sar-teal)" }}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Start Monitoring
                </button>
              </>
            )}
          </div>

          {/* Playback & Seek Bar */}
          {(isActive || isDone) && (
            <div
              className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}
            >
              {step === "running" && (
                <button
                  id="sar-pause-btn"
                  type="button"
                  onClick={handlePause}
                  className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold"
                  style={{ background: "var(--sar-amber-dim)", color: "var(--sar-amber)", border: "1px solid rgba(245,158,11,0.25)" }}
                >
                  <Pause className="h-3 w-3" /> Pause
                </button>
              )}
              {step === "paused" && (
                <button
                  id="sar-resume-btn"
                  type="button"
                  onClick={handleResume}
                  className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold"
                  style={{ background: "var(--sar-green-dim)", color: "var(--sar-green)", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  <Play className="h-3 w-3" /> Resume
                </button>
              )}
              {isActive && step !== "stopping" && (
                <button
                  id="sar-stop-btn"
                  type="button"
                  onClick={handleStop}
                  className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold"
                  style={{ background: "var(--sar-red-dim)", color: "var(--sar-red)", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  <Square className="h-3 w-3 fill-current" /> Stop
                </button>
              )}
              <button
                id="sar-reset-btn"
                type="button"
                onClick={handleReset}
                className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium"
                style={{ background: "var(--sar-surface-3)", color: "var(--sar-text-2)" }}
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>

              {durationSec > 0 && (
                <div className="flex min-w-[140px] flex-1 items-center gap-2">
                  <span className="font-mono text-[11px]" style={{ color: "var(--sar-text-3)" }}>
                    {fmtDuration(isSeekingRef.current ? seekDisplay : positionSec)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={durationSec}
                    step={0.1}
                    value={seekDisplay}
                    disabled={!isActive || step === "stopping"}
                    aria-label="Seek video position"
                    onMouseDown={() => { isSeekingRef.current = true; }}
                    onTouchStart={() => { isSeekingRef.current = true; }}
                    onChange={(e) => setSeekDisplay(Number(e.target.value))}
                    onMouseUp={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
                    onTouchEnd={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
                    className="w-full"
                  />
                  <span className="font-mono text-[11px]" style={{ color: "var(--sar-text-3)" }}>
                    {fmtDuration(durationSec)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5/12): Full-height Detections / History / Config Panel */}
        <div className="flex flex-col lg:col-span-5">
          <div
            className="flex flex-1 flex-col overflow-hidden rounded-xl"
            style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}
          >
            <div
              className="flex items-center justify-between gap-2 px-3 py-2"
              style={{ borderBottom: "1px solid var(--sar-border)" }}
            >
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" style={{ color: "var(--sar-teal)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--sar-text-2)" }}>
                  Detections
                </span>
                <span className="badge-base badge-teal">{frameDetections.length} in frame</span>
              </div>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "detections", label: "Live" },
                    { id: "history", label: "History" },
                    { id: "config", label: "Config" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRightTab(t.id)}
                    className="rounded px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: rightTab === t.id ? "var(--sar-teal-dim)" : "transparent",
                      color: rightTab === t.id ? "var(--sar-teal)" : "var(--sar-text-3)",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {rightTab === "detections" && (
              <div className="h-[360px] overflow-y-auto p-2 space-y-1.5">
                {frameDetections.length === 0 && latestDetections.length === 0 ? (
                  <EmptyState
                    message={
                      isIdle
                        ? "Upload an RGB video or dataset images and start monitoring"
                        : isActive
                        ? "Scanning frames for persons…"
                        : "No detections in this session"
                    }
                  />
                ) : (
                  (frameDetections.length > 0 ? frameDetections : [...latestDetections].reverse().slice(0, 20)).map(
                    (det: LiveDetection, idx: number) => {
                      const pct = Math.round(det.confidence * 100);
                      const matchingAlert = sessionAlerts.find((a) => a.detection_id === det.detection_id);
                      return (
                        <div
                          key={det.detection_id}
                          className="flex items-center gap-2.5 rounded-lg p-1.5"
                          style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)" }}
                        >
                          <img
                            src={`${API_BASE_URL}${det.crop_url}`}
                            alt={`Person ${idx + 1}`}
                            className="h-10 w-10 shrink-0 rounded bg-black object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold" style={{ color: "var(--sar-text-1)" }}>
                                #{idx + 1} · Frame {det.frame_number}
                              </span>
                              <span className="font-mono text-xs font-bold" style={{ color: "var(--sar-amber)" }}>
                                {pct}%
                              </span>
                            </div>
                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--sar-surface-3)" }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--sar-amber)" }} />
                            </div>
                            <div className="mt-1 text-[10px]" style={{ color: "var(--sar-text-3)" }}>
                              {det.latitude !== null && det.longitude !== null
                                ? `${det.latitude.toFixed(5)}, ${det.longitude.toFixed(5)}`
                                : "GPS unavailable"}
                            </div>
                          </div>
                          <button
                            type="button"
                            title="Open alert details"
                            onClick={() => navigate(matchingAlert ? `/alerts/${matchingAlert.alert_id}` : "/alerts")}
                            className="shrink-0 rounded p-1 hover:opacity-80"
                            style={{ color: "var(--sar-text-3)" }}
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    },
                  )
                )}
              </div>
            )}

            {rightTab === "history" && (
              <div className="h-[360px] overflow-y-auto">
                {latestDetections.length === 0 ? (
                  <EmptyState message="No detection history yet" />
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--sar-border)", color: "var(--sar-text-3)" }}>
                        <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase">Frame</th>
                        <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase">Conf</th>
                        <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase">GPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...latestDetections].reverse().map((det) => (
                        <tr key={det.detection_id} style={{ borderBottom: "1px solid var(--sar-border)" }}>
                          <td className="px-2.5 py-1.5 font-mono text-[11px]" style={{ color: "var(--sar-text-2)" }}>
                            #{det.frame_number} ({det.video_time_seconds.toFixed(1)}s)
                          </td>
                          <td className="px-2.5 py-1.5"><ConfBadge confidence={det.confidence} /></td>
                          <td className="px-2.5 py-1.5 text-[11px]" style={{ color: "var(--sar-text-3)" }}>
                            {det.latitude !== null ? `${det.latitude.toFixed(4)}, ${det.longitude!.toFixed(4)}` : "GPS unavailable"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {rightTab === "config" && (
              <div className="h-[360px] space-y-3 overflow-y-auto p-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase" style={{ color: "var(--sar-text-3)" }}>
                      <Sliders className="h-3 w-3" /> Confidence Threshold
                    </span>
                    <span className="font-mono text-xs font-semibold" style={{ color: "var(--sar-teal)" }}>
                      {threshold.toFixed(2)}{thresholdPending ? " ·" : ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.9}
                    step={0.01}
                    value={threshold}
                    aria-label="Confidence threshold"
                    onChange={(e) => handleThresholdChange(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase" style={{ color: "var(--sar-text-3)" }}>
                    Drone GPS Overlay (Optional)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number" step="any" placeholder="Lat (e.g. 28.6139)" value={droneLat}
                      onChange={(e) => setDroneLat(e.target.value)}
                      className="h-8 rounded-md px-2 text-xs outline-none"
                      style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
                    />
                    <input
                      type="number" step="any" placeholder="Lon (e.g. 77.2090)" value={droneLon}
                      onChange={(e) => setDroneLon(e.target.value)}
                      className="h-8 rounded-md px-2 text-xs outline-none"
                      style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
                    />
                    <input
                      type="number" step="any" placeholder="Alt m (e.g. 50)" value={droneAlt}
                      onChange={(e) => setDroneAlt(e.target.value)}
                      className="h-8 rounded-md px-2 text-xs outline-none"
                      style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
                    />
                    <input
                      type="number" step="any" placeholder="Yaw deg (0)" value={droneYaw}
                      onChange={(e) => setDroneYaw(e.target.value)}
                      className="h-8 rounded-md px-2 text-xs outline-none"
                      style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
                    />
                  </div>
                  {sessionId && isActive && (
                    <button
                      type="button"
                      onClick={() => { void applyDroneConfig(); pushToast("Applying drone GPS config..."); }}
                      className="mt-2 h-7 w-full rounded-md text-[11px] font-semibold"
                      style={{ background: "var(--sar-teal-dim)", color: "var(--sar-teal)" }}
                    >
                      Apply GPS Overlay
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function EmptyFeed({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
      <Layers className="h-6 w-6" style={{ color: "var(--sar-text-3)" }} />
      <span className="text-xs" style={{ color: "var(--sar-text-3)" }}>{text}</span>
    </div>
  );
}
