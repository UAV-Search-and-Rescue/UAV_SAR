import {
  AlertCircle,
  Braces,
  Check,
  ChevronDown,
  Crosshair,
  FileImage,
  Flame,
  Image as ImageIcon,
  Info,
  Maximize2,
  Play,
  Settings2,
  SlidersHorizontal,
  Table2,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Panel } from "../components/ui";
import { useSystemSettings } from "../context/SystemSettings";
import { detectionModels, formatConfidence, imageSizes, type ModelOption } from "../data/detection";
import { cn } from "../lib/cn";
import {
  ApiRequestError,
  getApiBaseUrl,
  getApiHealth,
  postDetection,
  type ApiHealth,
  type Detection,
  type DetectionResponse,
} from "../lib/api";

type ImageSlot = { file: File; url: string; width: number; height: number } | null;
type ResultTab = "visual" | "objects" | "json" | "details";

const MAX_BYTES = 5 * 1024 * 1024;
const tabs: { id: ResultTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "visual", label: "Visual Result", icon: ImageIcon },
  { id: "objects", label: "Detected Objects", icon: Table2 },
  { id: "json", label: "JSON Response", icon: Braces },
  { id: "details", label: "Details", icon: Info },
];

function getFileError(file: File) {
  if (file.size > MAX_BYTES) return "File must be 5 MB or smaller.";
  if (!["image/jpeg", "image/png"].includes(file.type)) return "Choose a JPG or PNG image.";
  return "";
}

function modelOptionStatus(
  modelId: ModelOption["id"],
  health: ApiHealth | null,
  apiStatus: "checking" | "available" | "offline" | "unconfigured",
) {
  if (detectionModels.find((item) => item.id === modelId)?.status === "Planned") return "Planned";
  if (apiStatus === "checking") return "Checking";
  if (apiStatus === "unconfigured") return "API not configured";
  if (apiStatus === "offline") return "API offline";
  const model = health?.models.find((item) => item.model_version === modelId.toUpperCase());
  return model?.available ? "Available" : "Unavailable";
}

export function DetectionPage() {
  const { settings } = useSystemSettings();
  const [rgb, setRgb] = useState<ImageSlot>(null);
  const [thermal, setThermal] = useState<ImageSlot>(null);
  const [rgbError, setRgbError] = useState("");
  const [thermalError, setThermalError] = useState("");
  const [runError, setRunError] = useState("");
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [apiStatus, setApiStatus] = useState<"checking" | "available" | "offline" | "unconfigured">(
    getApiBaseUrl() ? "checking" : "unconfigured",
  );
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [modelId, setModelId] = useState<ModelOption["id"]>(settings.modelId);
  const [threshold, setThreshold] = useState(settings.threshold);
  const [imageSize, setImageSize] = useState(settings.imageSize);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [iou, setIou] = useState("0.45");
  const [maxDetections, setMaxDetections] = useState("100");
  const [tab, setTab] = useState<ResultTab>("visual");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<"rgb" | "thermal" | null>(null);
  const objectUrls = useRef(new Set<string>());
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const visualRef = useRef<HTMLDivElement>(null);

  const backendModel = apiHealth?.models.find((model) => model.model_version === modelId.toUpperCase());
  const modelAvailable = backendModel?.available === true;

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!getApiBaseUrl()) {
      setApiStatus("unconfigured");
      return;
    }

    let active = true;
    let controller: AbortController | null = null;
    const checkHealth = async () => {
      const requestController = new AbortController();
      controller = requestController;
      const timeout = window.setTimeout(() => requestController.abort(), 5000);
      try {
        const health = await getApiHealth(requestController.signal);
        if (!active) return;
        setApiHealth(health);
        setApiStatus("available");
      } catch {
        if (!active) return;
        setApiHealth(null);
        setApiStatus("offline");
      } finally {
        window.clearTimeout(timeout);
      }
    };

    void checkHealth();
    const interval = window.setInterval(() => void checkHealth(), 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  async function assignFile(channel: "rgb" | "thermal", file: File | null) {
    const current = channel === "rgb" ? rgb : thermal;
    const update = channel === "rgb" ? setRgb : setThermal;
    const setFieldError = channel === "rgb" ? setRgbError : setThermalError;
    setRunError("");
    if (!file) return;

    const error = getFileError(file);
    if (error) {
      setFieldError(error);
      return;
    }

    let width: number;
    let height: number;
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch {
      setFieldError("The selected file could not be decoded as an image.");
      return;
    }

    if (current) {
      URL.revokeObjectURL(current.url);
      objectUrls.current.delete(current.url);
    }
    const next = { file, url: URL.createObjectURL(file), width, height };
    objectUrls.current.add(next.url);
    update(next);
    setFieldError("");
  }

  function clearFile(channel: "rgb" | "thermal") {
    const current = channel === "rgb" ? rgb : thermal;
    const update = channel === "rgb" ? setRgb : setThermal;
    const setFieldError = channel === "rgb" ? setRgbError : setThermalError;
    if (current) {
      URL.revokeObjectURL(current.url);
      objectUrls.current.delete(current.url);
    }
    update(null);
    setFieldError("");
    setRunError("");
  }

  async function runDetection() {
    if (!rgb) {
      setRunError("Select a required RGB image before running detection.");
      return;
    }
    if (!modelAvailable) {
      setRunError(backendModel?.reason || "The selected model is not available.");
      return;
    }

    const parsedIou = Number(iou);
    const parsedMaxDetections = Number(maxDetections);
    if (!Number.isFinite(parsedIou) || parsedIou <= 0 || parsedIou > 1) {
      setRunError("IoU threshold must be greater than 0 and at most 1.");
      return;
    }
    if (!Number.isInteger(parsedMaxDetections) || parsedMaxDetections < 1 || parsedMaxDetections > 1000) {
      setRunError("Maximum detections must be a whole number from 1 to 1000.");
      return;
    }

    const formData = new FormData();
    formData.append("rgb", rgb.file);
    formData.append("model_version", modelId.toUpperCase());
    if (thermal) formData.append("thermal", thermal.file);
    formData.append("confidence_threshold", String(threshold));
    formData.append("image_size", imageSize);
    formData.append("iou_threshold", String(parsedIou));
    formData.append("max_detections", String(parsedMaxDetections));

    setRunError("");
    setResult(null);
    setRunning(true);
    try {
      const response = await postDetection(formData);
      setResult(response);
      setSelectedId(null);
      setTab("visual");
    } catch (error) {
      setRunError(error instanceof ApiRequestError ? error.message : "Detection request failed.");
    } finally {
      setRunning(false);
    }
  }

  function viewObject(id: number) {
    setSelectedId(id);
    setTab("visual");
    visualRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function onTabKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((item) => item.id === tab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    setTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 pb-8 pt-2 sm:px-6 lg:px-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Detection</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Upload an RGB image and, optionally, a thermal image for person detection.
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-5">
          <Panel className="p-4 sm:p-5">
            <SectionTitle icon={<ImageIcon className="h-4 w-4" />} title="Input images" />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">JPG or PNG · Maximum 5 MB per image</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <UploadSlot
                title="RGB image"
                required
                icon={<FileImage className="h-4 w-4" />}
                slot={rgb}
                error={rgbError}
                onFile={(file) => assignFile("rgb", file)}
                onClear={() => clearFile("rgb")}
              />
              <UploadSlot
                title="Thermal image"
                icon={<Flame className="h-4 w-4" />}
                slot={thermal}
                error={thermalError}
                onFile={(file) => assignFile("thermal", file)}
                onClear={() => clearFile("thermal")}
              />
            </div>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionTitle icon={<SlidersHorizontal className="h-4 w-4" />} title="Detection settings" />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Availability is read from the backend. E0 runs RGB inference; thermal input is not used by E0.
            </p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Model</span>
                <span className="relative block">
                  <select
                    value={modelId}
                    onChange={(event) => {
                      const selected = detectionModels.find((item) => item.id === event.target.value);
                      if (selected) setModelId(selected.id);
                    }}
                    className="h-10 w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 pr-9 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    {detectionModels.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={item.status === "Planned" || !apiHealth?.models.some(
                          (model) => model.model_version === item.id.toUpperCase() && model.available,
                        )}
                      >
                        {item.label} · {modelOptionStatus(item.id, apiHealth, apiStatus)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                  />
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="flex items-center justify-between gap-3 text-sm font-medium text-[var(--color-text)]">
                    Confidence threshold
                    <output htmlFor="confidence-threshold" className="font-mono text-xs text-[var(--color-text-muted)]">
                      {formatConfidence(threshold)}
                    </output>
                  </span>
                  <input
                    id="confidence-threshold"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={threshold}
                    onChange={(event) => setThreshold(Number(event.target.value))}
                    className="mt-3 h-1.5 w-full cursor-pointer accent-blue-600"
                  />
                  <span className="mt-1 flex justify-between text-[11px] text-[var(--color-text-muted)]">
                    <span>0.00</span>
                    <span>1.00</span>
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Image size</span>
                  <span className="relative block">
                    <select
                      value={imageSize}
                      onChange={(event) => setImageSize(event.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 pr-9 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    >
                      {imageSizes.map((size) => (
                        <option key={size.id} value={size.id}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                    />
                  </span>
                </label>
              </div>

              <section className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((open) => !open)}
                  aria-expanded={advancedOpen}
                  aria-controls="advanced-detection-options"
                  className="flex min-h-10 w-full items-center justify-between px-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-background)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Settings2 aria-hidden="true" className="h-4 w-4 text-[var(--color-text-muted)]" />
                    Advanced options
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("h-4 w-4 text-[var(--color-text-muted)] transition-transform", advancedOpen && "rotate-180")}
                  />
                </button>
                {advancedOpen && (
                  <div id="advanced-detection-options" className="grid gap-3 border-t border-[var(--color-border)] p-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-[var(--color-text-muted)]">
                      IoU threshold
                      <input
                        type="number"
                        min={0.01}
                        max={1}
                        step={0.05}
                        value={iou}
                        onChange={(event) => setIou(event.target.value)}
                        className="mt-1.5 h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      />
                    </label>
                    <label className="text-xs font-medium text-[var(--color-text-muted)]">
                      Maximum detections
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        step={1}
                        value={maxDetections}
                        onChange={(event) => setMaxDetections(event.target.value)}
                        className="mt-1.5 h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      />
                    </label>
                  </div>
                )}
              </section>

              <div className="border-t border-[var(--color-border)] pt-4">
                <button
                  type="button"
                  onClick={runDetection}
                  disabled={!rgb || !modelAvailable || running}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  {running ? (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                  ) : (
                    <Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                  )}
                  {running ? "Running detection…" : "Run Detection"}
                </button>
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[var(--color-text-muted)]">
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  {apiStatus === "checking" && "Checking backend connection…"}
                  {apiStatus === "unconfigured" && "Set VITE_API_BASE_URL to enable backend inference."}
                  {apiStatus === "offline" && "Backend is unavailable. Check that FastAPI is running and try again."}
                  {apiStatus === "available" && !modelAvailable && (backendModel?.reason || "No selected model is available.")}
                  {apiStatus === "available" && modelAvailable && !rgb && "Select a required RGB image to run detection."}
                  {apiStatus === "available" && modelAvailable && rgb && "Backend and selected model are ready."}
                </p>
                {runError && (
                  <p role="alert" className="mt-2 text-sm font-medium text-[var(--color-danger)]">
                    {runError}
                  </p>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <Panel className="min-w-0 overflow-hidden lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-[var(--color-primary)]">
                <Crosshair aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[var(--color-text)]">Detection results</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {result ? `Inference · ${result.model_version}` : "Inference output and metadata"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {result && <span className="text-xs text-[var(--color-text-muted)]">{result.latency_ms.toFixed(1)} ms</span>}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium",
                  result ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]",
                )}
              >
                {result ? (
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 text-amber-600" />
                )}
                {result ? (result.result_saved ? "Live result · saved" : "Live result") : apiStatus === "available" ? "Ready" : "Unavailable"}
              </span>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Detection result views"
            onKeyDown={onTabKeyDown}
            className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-3"
          >
            {tabs.map((item, index) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  id={`detection-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="detection-tab-panel"
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]",
                    active
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                  )}
                >
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div
            id="detection-tab-panel"
            role="tabpanel"
            aria-labelledby={`detection-tab-${tab}`}
            tabIndex={0}
            className="min-w-0 p-4 focus-visible:outline-none sm:p-5"
          >
            {tab === "visual" && (
              <>
                <div ref={visualRef} className="grid min-w-0 gap-4 md:grid-cols-2">
                  <ResultPreview
                    title="RGB detections"
                    slot={rgb}
                    detections={result?.used_modalities.includes("rgb") ? result.detections : []}
                    selectedId={selectedId}
                    onExpand={() => setExpanded("rgb")}
                    emptyMessage="No RGB image was provided."
                  />
                  <ResultPreview
                    title="Thermal input"
                    slot={thermal}
                    detections={[]}
                    selectedId={null}
                    onExpand={() => setExpanded("thermal")}
                    emptyMessage="No thermal image was provided."
                  />
                </div>
                {result && (
                  <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                    {result.detections.length === 0
                      ? "Inference completed. No detections met the selected confidence threshold."
                      : `${result.detections.length} detection${result.detections.length === 1 ? "" : "s"} returned.`}
                    {thermal && !result.used_modalities.includes("thermal") && " Thermal input was not used by the selected model."}
                  </p>
                )}
                <ObjectTable
                  detections={result?.detections ?? []}
                  selectedId={selectedId}
                  onView={viewObject}
                  className="mt-5"
                  hasResult={Boolean(result)}
                />
              </>
            )}
            {tab === "objects" && (
              <ObjectTable
                detections={result?.detections ?? []}
                selectedId={selectedId}
                onView={viewObject}
                hasResult={Boolean(result)}
              />
            )}
            {tab === "json" && (
              result ? (
                <pre className="max-h-[70vh] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs leading-5 text-[var(--color-text)]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <UnavailableState
                  title="No JSON response"
                  message="A response will appear here after a successful inference request."
                  icon={<Braces className="h-5 w-5" />}
                />
              )
            )}
            {tab === "details" && (
              result ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <Detail label="Request ID" value={result.request_id} />
                  <Detail label="Model" value={result.model_version} />
                  <Detail label="Timestamp" value={new Date(result.timestamp).toLocaleString()} />
                  <Detail label="Inference time" value={`${result.latency_ms.toFixed(1)} ms`} />
                  <Detail label="Modalities used" value={result.used_modalities.join(", ") || "None"} />
                  <Detail label="Saved to results" value={result.result_saved ? "Yes" : "No"} />
                </dl>
              ) : (
                <UnavailableState
                  title="Execution details unavailable"
                  message="Model, timing, and result metadata are only available after an actual inference response."
                  icon={<Info className="h-5 w-5" />}
                />
              )
            )}
          </div>
        </Panel>
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${expanded === "rgb" ? "RGB" : "Thermal"} image preview`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setExpanded(null)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{expanded === "rgb" ? "RGB image" : "Thermal image"}</h2>
              <button
                type="button"
                aria-label="Close image preview"
                onClick={() => setExpanded(null)}
                className="grid h-9 w-9 place-items-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <ResultPreview
              title=""
              slot={expanded === "rgb" ? rgb : thermal}
              detections={
                expanded === "rgb" && result?.used_modalities.includes("rgb")
                  ? result.detections
                  : []
              }
              selectedId={expanded === "rgb" ? selectedId : null}
              emptyMessage="No image selected."
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-[var(--color-primary)]">
        {icon}
      </span>
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
    </div>
  );
}

function UploadSlot({
  title,
  required,
  icon,
  slot,
  error,
  onFile,
  onClear,
}: {
  title: string;
  required?: boolean;
  icon: ReactNode;
  slot: ImageSlot;
  error: string;
  onFile: (file: File | null) => void;
  onClear: () => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const [over, setOver] = useState(false);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
        <span>{title}</span>
        {required ? (
          <span className="text-[var(--color-danger)]">(Required)</span>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">(Optional)</span>
        )}
      </div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          onFile(event.dataTransfer.files[0] ?? null);
        }}
        className={cn(
          "relative min-h-[112px] rounded-lg border border-dashed p-3 transition-colors focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-2",
          over
            ? "border-blue-500 bg-blue-500/5"
            : "border-[var(--color-border)] bg-[var(--color-background)]",
          error && "border-[var(--color-danger)]",
        )}
      >
        {slot ? (
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={slot.url}
              alt={`${title} preview`}
              className="h-16 w-20 shrink-0 rounded-md bg-slate-950 object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--color-text)]" title={slot.file.name}>
                {slot.file.name}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {(slot.file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <label
                htmlFor={inputId}
                className="mt-2 inline-flex min-h-8 cursor-pointer items-center text-xs font-semibold text-blue-600 underline underline-offset-2 dark:text-blue-400"
              >
                Replace image
              </label>
            </div>
            <button
              type="button"
              aria-label={`Remove ${title}`}
              onClick={onClear}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-danger)]"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex min-h-[86px] flex-col items-center justify-center text-center">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-surface)] text-[var(--color-primary)]">
              {icon}
            </span>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">Drop an image or browse files</p>
            <label
              htmlFor={inputId}
              className="mt-1 inline-flex min-h-8 cursor-pointer items-center text-xs font-semibold text-blue-600 underline underline-offset-2 focus-within:outline-none dark:text-blue-400"
            >
              Choose {required ? "RGB" : "thermal"} image
            </label>
          </div>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          aria-label={`${title}${required ? " (required)" : " (optional)"}`}
          aria-describedby={error ? errorId : undefined}
          className="sr-only"
          onChange={(event) => {
            onFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

function ResultPreview({
  title,
  slot,
  detections,
  selectedId,
  onExpand,
  emptyMessage,
}: {
  title: string;
  slot: ImageSlot;
  detections: Detection[];
  selectedId: number | null;
  onExpand?: () => void;
  emptyMessage: string;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        {title && <h3 className="truncate text-sm font-medium text-[var(--color-text)]">{title}</h3>}
        {slot && onExpand && (
          <button
            type="button"
            aria-label={`Expand ${title}`}
            onClick={onExpand}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
          >
            <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="grid min-h-56 max-h-[60vh] place-items-center overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
        {slot ? (
          <div
            className="relative max-w-full overflow-hidden"
            style={{
              aspectRatio: `${slot.width} / ${slot.height}`,
              width: "100%",
            }}
          >
            <img
              src={slot.url}
              alt={title ? `${title} image` : "Expanded image preview"}
              className="absolute inset-0 h-full w-full object-fill"
            />
            {detections.map((detection, index) => {
              const left = Math.min(100, Math.max(0, (detection.bbox.x1 / slot.width) * 100));
              const top = Math.min(100, Math.max(0, (detection.bbox.y1 / slot.height) * 100));
              const width = Math.min(100 - left, Math.max(0, ((detection.bbox.x2 - detection.bbox.x1) / slot.width) * 100));
              const height = Math.min(100 - top, Math.max(0, ((detection.bbox.y2 - detection.bbox.y1) / slot.height) * 100));
              return (
                <div
                  key={`${detection.class_name}-${index}`}
                  className={cn(
                    "absolute border-2 border-red-500",
                    selectedId === index + 1 && "ring-2 ring-blue-500 ring-offset-1",
                  )}
                  style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                >
                  <span className="absolute left-0 top-0 -translate-y-full whitespace-nowrap bg-red-600 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {detection.class_name} {formatConfidence(detection.confidence)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex max-w-xs flex-col items-center px-4 text-center">
            <ImageIcon aria-hidden="true" className="h-5 w-5 text-[var(--color-text-muted)]" />
            <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{emptyMessage}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">No output will be shown until inference is available.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ObjectTable({
  detections,
  selectedId,
  onView,
  className,
  hasResult,
}: {
  detections: Detection[];
  selectedId: number | null;
  onView: (id: number) => void;
  className?: string;
  hasResult: boolean;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          Detected objects{hasResult ? ` (${detections.length})` : ""}
        </h3>
      </div>
      {!hasResult ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
          Objects will appear after a successful inference response.
        </p>
      ) : detections.length === 0 ? (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm text-[var(--color-text-muted)]">
          Inference completed with zero detections.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[var(--color-background)] text-xs text-[var(--color-text-muted)]">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">#</th>
                <th scope="col" className="px-3 py-2 font-medium">Class</th>
                <th scope="col" className="px-3 py-2 font-medium">Confidence</th>
                <th scope="col" className="px-3 py-2 font-medium">Bounding box (x1, y1, x2, y2)</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">View</th>
              </tr>
            </thead>
            <tbody>
              {detections.map((detection, index) => (
                <tr
                  key={`${detection.class_name}-${index}`}
                  className={cn(
                    "border-t border-[var(--color-border)]",
                    selectedId === index + 1 && "bg-blue-500/5",
                  )}
                >
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{index + 1}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text)]">{detection.class_name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--color-text)]">
                    {formatConfidence(detection.confidence)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                    ({detection.bbox.x1.toFixed(1)}, {detection.bbox.y1.toFixed(1)}, {detection.bbox.x2.toFixed(1)}, {detection.bbox.y2.toFixed(1)})
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onView(index + 1)}
                      className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] dark:text-blue-400"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UnavailableState({ title, message, icon }: { title: string; message: string; icon: ReactNode }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text-muted)]">
          {icon}
        </span>
        <h3 className="mt-3 text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">{message}</p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2">
      <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-0.5 break-all font-medium text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
