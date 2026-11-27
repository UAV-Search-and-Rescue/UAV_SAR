import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getLiveAlerts,
  getLiveSession,
  getSampleFootageInfo,
  loadSampleFootageSession,
  pauseLiveSession,
  resetAllLiveData,
  resumeLiveSession,
  seekLiveSession,
  setLiveThreshold,
  startLiveSession,
  stopLiveSession,
  updateLiveDroneConfig,
  uploadLiveImages,
  uploadLiveVideos,
  type LiveAlert,
  type LiveSessionStatus,
  type SampleFootageInfo,
} from "../lib/api";
import { useUi } from "./UiContext";

export type SessionStep =
  | "idle"
  | "uploading"
  | "starting"
  | "running"
  | "paused"
  | "stopping"
  | "completed"
  | "stopped"
  | "error";

const ACTIVE_STEPS: SessionStep[] = ["running", "paused", "stopping"];
const TERMINAL_STEPS: SessionStep[] = ["completed", "stopped", "error"];
const POLL_MS = 500;
const THRESHOLD_DEBOUNCE_MS = 400;

type LiveSessionContextValue = {
  inputMode: "video" | "images";
  setInputMode: (m: "video" | "images") => void;
  rgbFile: File | null;
  handleRgbFile: (f: File | null) => void;
  thermalFile: File | null;
  setThermalFile: (f: File | null) => void;
  rgbImages: File[];
  setRgbImages: (files: File[]) => void;
  thermalImages: File[];
  setThermalImages: (files: File[]) => void;
  rgbPreviewUrl: string | null;

  step: SessionStep;
  sessionId: string | null;
  sessionStatus: LiveSessionStatus | null;
  error: string;
  setError: (e: string) => void;

  threshold: number;
  seekDisplay: number;
  setSeekDisplay: (v: number) => void;
  thresholdPending: boolean;
  streamKey: number;
  isSeekingRef: React.MutableRefObject<boolean>;

  droneLat: string;
  setDroneLat: (v: string) => void;
  droneLon: string;
  setDroneLon: (v: string) => void;
  droneAlt: string;
  setDroneAlt: (v: string) => void;
  droneYaw: string;
  setDroneYaw: (v: string) => void;
  sampleInfo: SampleFootageInfo | null;

  liveAlerts: LiveAlert[];
  openAlertsCount: number;

  handleStart: () => Promise<void>;
  handleLoadSample: () => Promise<void>;
  handlePause: () => Promise<void>;
  handleResume: () => Promise<void>;
  handleStop: () => Promise<void>;
  handleReset: () => void;
  handleResetAll: () => Promise<void>;
  handleSeekCommit: (val: number) => Promise<void>;
  handleThresholdChange: (val: number) => void;
  applyDroneConfig: () => Promise<void>;
};

const LiveSessionContext = createContext<LiveSessionContextValue | null>(null);

export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const { pushToast } = useUi();

  const [inputMode, setInputMode] = useState<"video" | "images">("video");
  const [rgbFile, setRgbFile] = useState<File | null>(null);
  const [thermalFile, setThermalFile] = useState<File | null>(null);
  const [rgbImages, setRgbImages] = useState<File[]>([]);
  const [thermalImages, setThermalImages] = useState<File[]>([]);
  const [rgbPreviewUrl, setRgbPreviewUrl] = useState<string | null>(null);

  const [step, setStep] = useState<SessionStep>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<LiveSessionStatus | null>(null);
  const [error, setError] = useState("");

  const [threshold, setThreshold] = useState(0.10);
  const [seekDisplay, setSeekDisplay] = useState(0);
  const [thresholdPending, setThresholdPending] = useState(false);
  const [streamKey, setStreamKey] = useState(0);

  const [droneLat, setDroneLat] = useState("");
  const [droneLon, setDroneLon] = useState("");
  const [droneAlt, setDroneAlt] = useState("");
  const [droneYaw, setDroneYaw] = useState("0");
  const [sampleInfo, setSampleInfo] = useState<SampleFootageInfo | null>(null);
  const [globalAlerts, setGlobalAlerts] = useState<LiveAlert[]>([]);

  const isSeekingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;
  const pollingRef = useRef<number | null>(null);
  const thresholdDebounceRef = useRef<number | null>(null);
  const rgbPreviewUrlRef = useRef<string | null>(null);
  rgbPreviewUrlRef.current = rgbPreviewUrl;
  const lastAlertIdRef = useRef<string | null>(null);

  const clearPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    getSampleFootageInfo().then(setSampleInfo).catch(() => {});
    const fetchAlerts = () => {
      getLiveAlerts().then(setGlobalAlerts).catch(() => {});
    };
    fetchAlerts();
    const alertTimer = window.setInterval(fetchAlerts, 2000);
    return () => {
      clearPolling();
      window.clearInterval(alertTimer);
      if (thresholdDebounceRef.current !== null) window.clearTimeout(thresholdDebounceRef.current);
      if (rgbPreviewUrlRef.current) URL.revokeObjectURL(rgbPreviewUrlRef.current);
    };
  }, [clearPolling]);

  useEffect(() => {
    const alerts = sessionStatus?.alerts;
    if (alerts && alerts.length > 0) {
      const newest = alerts[alerts.length - 1];
      if (newest.alert_id !== lastAlertIdRef.current) {
        lastAlertIdRef.current = newest.alert_id;
        pushToast(`Alert: ${newest.headline} — ${Math.round(newest.confidence * 100)}%`);
        getLiveAlerts().then(setGlobalAlerts).catch(() => {});
      }
    }
  }, [sessionStatus, pushToast]);

  const startPolling = useCallback(
    (id: string) => {
      clearPolling();
      pollingRef.current = window.setInterval(async () => {
        if (sessionIdRef.current !== id) {
          clearPolling();
          return;
        }
        try {
          const status = await getLiveSession(id);
          setSessionStatus(status);
          if (!isSeekingRef.current) setSeekDisplay(status.position_seconds);
          const newStep = status.status as SessionStep;
          setStep(newStep);
          if (TERMINAL_STEPS.includes(newStep)) clearPolling();
        } catch {
          /* keep polling */
        }
      }, POLL_MS);
    },
    [clearPolling],
  );

  function handleRgbFile(file: File | null) {
    if (rgbPreviewUrlRef.current) URL.revokeObjectURL(rgbPreviewUrlRef.current);
    setRgbFile(file);
    setRgbPreviewUrl(file ? URL.createObjectURL(file) : null);
    setError("");
  }

  function buildDroneConfigPayload() {
    const lat = parseFloat(droneLat);
    const lon = parseFloat(droneLon);
    const alt = parseFloat(droneAlt);
    const yaw = parseFloat(droneYaw);
    if (!Number.isFinite(alt) || alt <= 0 || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    return { lat, lon, alt, yaw: Number.isFinite(yaw) ? yaw : 0 };
  }

  async function handleStart() {
    if (inputMode === "video" && !rgbFile) {
      setError("Upload an RGB video before starting.");
      return;
    }
    if (inputMode === "images" && rgbImages.length === 0) {
      setError("Select at least one RGB dataset image before starting.");
      return;
    }
    setError("");
    setStep("uploading");
    lastAlertIdRef.current = null;
    try {
      const created =
        inputMode === "images"
          ? await uploadLiveImages(rgbImages, thermalImages, threshold, 2.0)
          : await uploadLiveVideos(rgbFile!, thermalFile, threshold);
      setSessionId(created.session_id);
      setSessionStatus(created);
      const cfg = buildDroneConfigPayload();
      if (cfg) await updateLiveDroneConfig(created.session_id, cfg);
      setSeekDisplay(0);
      setStep("starting");
      const started = await startLiveSession(created.session_id);
      setSessionStatus(started);
      setStep("running");
      setStreamKey((k) => k + 1);
      startPolling(created.session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start monitoring session");
      setStep("error");
    }
  }

  async function handleLoadSample() {
    if (!sampleInfo?.available) {
      setError(sampleInfo?.message ?? "No bundled sample footage found in backend/sample_footage/.");
      return;
    }
    setError("");
    setStep("starting");
    lastAlertIdRef.current = null;
    try {
      const created = await loadSampleFootageSession(threshold);
      setSessionId(created.session_id);
      setSessionStatus(created);
      const cfg = buildDroneConfigPayload();
      if (cfg) await updateLiveDroneConfig(created.session_id, cfg);
      setSeekDisplay(0);
      const started = await startLiveSession(created.session_id);
      setSessionStatus(started);
      setStep("running");
      setStreamKey((k) => k + 1);
      startPolling(created.session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample footage");
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
    if (thresholdDebounceRef.current !== null) window.clearTimeout(thresholdDebounceRef.current);
    if (rgbPreviewUrlRef.current) URL.revokeObjectURL(rgbPreviewUrlRef.current);
    setRgbFile(null);
    setThermalFile(null);
    setRgbImages([]);
    setThermalImages([]);
    setRgbPreviewUrl(null);
    setSessionId(null);
    setSessionStatus(null);
    setStep("idle");
    setError("");
    setSeekDisplay(0);
    setThreshold(0.10);
    setThresholdPending(false);
  }

  async function handleResetAll() {
    if (sessionId && ACTIVE_STEPS.includes(step)) {
      try {
        await stopLiveSession(sessionId);
      } catch {
        /* continue reset */
      }
    }
    handleReset();
    try {
      await resetAllLiveData();
    } catch {
      /* ignore */
    }
    lastAlertIdRef.current = null;
    setGlobalAlerts([]);
    pushToast("All detections and alerts reset to 0");
  }

  async function handleSeekCommit(value: number) {
    isSeekingRef.current = false;
    if (!sessionId || !ACTIVE_STEPS.includes(step)) return;
    try {
      await seekLiveSession(sessionId, value);
    } catch {
      /* non-critical */
    }
  }

  function handleThresholdChange(value: number) {
    setThreshold(value);
    if (!sessionId || !ACTIVE_STEPS.includes(step)) return;
    if (thresholdDebounceRef.current !== null) window.clearTimeout(thresholdDebounceRef.current);
    setThresholdPending(true);
    thresholdDebounceRef.current = window.setTimeout(async () => {
      try {
        await setLiveThreshold(sessionIdRef.current!, value);
      } catch {
        /* non-critical */
      } finally {
        setThresholdPending(false);
      }
    }, THRESHOLD_DEBOUNCE_MS);
  }

  async function applyDroneConfig() {
    if (!sessionId || !ACTIVE_STEPS.includes(step)) return;
    const cfg = buildDroneConfigPayload();
    if (!cfg) {
      pushToast("Enter valid Lat, Lon, and Alt > 0");
      return;
    }
    try {
      await updateLiveDroneConfig(sessionId, cfg);
      pushToast("Drone GPS config updated");
    } catch {
      pushToast("Failed to update drone GPS config");
    }
  }

  const liveAlerts =
    globalAlerts.length > 0 ? globalAlerts : sessionStatus?.alerts ?? [];
  const openAlertsCount = liveAlerts.filter((a) => a.state === "open").length;

  return (
    <LiveSessionContext.Provider
      value={{
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
        liveAlerts,
        openAlertsCount,
        handleStart,
        handleLoadSample,
        handlePause,
        handleResume,
        handleStop,
        handleReset,
        handleResetAll,
        handleSeekCommit,
        handleThresholdChange,
        applyDroneConfig,
      }}
    >
      {children}
    </LiveSessionContext.Provider>
  );
}

export function useLiveSession() {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) throw new Error("useLiveSession must be used inside LiveSessionProvider");
  return ctx;
}
