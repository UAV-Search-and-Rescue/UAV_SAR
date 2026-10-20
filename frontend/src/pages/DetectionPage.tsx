import {
  BookOpen,
  Braces,
  ChevronDown,
  Crosshair,
  Eye,
  Flame,
  Image as ImageIcon,
  Info,
  Play,
  Settings2,
  SlidersHorizontal,
  Table2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AerialScene } from "../components/dashboard/AerialScene";
import { Panel } from "../components/ui";
import { useSystemSettings } from "../context/SystemSettings";
import { useUi } from "../context/UiContext";
import {
  confidenceTone,
  detectionModels,
  formatConfidence,
  imageSizes,
  rgbDetections,
  thermalDetections,
  type DetectedObject,
  type ModelOption,
} from "../data/detection";
import { matchesQuery } from "../data/mission";
import { cn } from "../lib/cn";

type ImageSlot =
  | { kind: "demo"; name: string }
  | { kind: "file"; url: string; name: string }
  | { kind: "empty" };

type ResultTab = "visual" | "objects" | "json" | "details";

const MAX_BYTES = 10 * 1024 * 1024;

const tabs: { id: ResultTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "visual", label: "Visual Result", icon: ImageIcon },
  { id: "objects", label: "Detected Objects", icon: Table2 },
  { id: "json", label: "JSON Response", icon: Braces },
  { id: "details", label: "Details", icon: Info },
];

function peopleFrom(objects: DetectedObject[]) {
  return objects.map((object) => ({
    x: object.frame.x + object.frame.w / 2,
    y: object.frame.y + object.frame.h / 2,
  }));
}

function releaseSlot(slot: ImageSlot) {
  if (slot.kind === "file") URL.revokeObjectURL(slot.url);
}

export function DetectionPage() {
  const { query, pushToast } = useUi();
  const { settings } = useSystemSettings();
  const [rgb, setRgb] = useState<ImageSlot>({ kind: "demo", name: "rgb-sample.jpg" });
  const [thermal, setThermal] = useState<ImageSlot>({ kind: "demo", name: "thermal-sample.jpg" });
  const [modelId, setModelId] = useState<ModelOption["id"]>(settings.modelId);
  const [threshold, setThreshold] = useState(settings.threshold);
  const [imageSize, setImageSize] = useState(settings.imageSize);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [iou, setIou] = useState(0.45);
  const [maxDetections, setMaxDetections] = useState(100);
  const [docsOpen, setDocsOpen] = useState(false);
  const [tab, setTab] = useState<ResultTab>("visual");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<"rgb" | "thermal" | null>(null);
  const [applied, setApplied] = useState({
    modelId: settings.modelId,
    threshold: settings.threshold,
    imageSize: settings.imageSize,
    iou: 0.45,
    maxDetections: 100,
    inferenceMs: 42,
    rgb: { kind: "demo", name: "rgb-sample.jpg" } as ImageSlot,
    thermal: { kind: "demo", name: "thermal-sample.jpg" } as ImageSlot,
  });
  const visualRef = useRef<HTMLDivElement>(null);
  const slots = useRef({ rgb, thermal, appliedRgb: applied.rgb, appliedThermal: applied.thermal });
  slots.current = { rgb, thermal, appliedRgb: applied.rgb, appliedThermal: applied.thermal };

  useEffect(() => {
    return () => {
      const urls = [slots.current.rgb, slots.current.thermal, slots.current.appliedRgb, slots.current.appliedThermal]
        .filter((slot): slot is Extract<ImageSlot, { kind: "file" }> => slot.kind === "file")
        .map((slot) => slot.url);
      new Set(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!docsOpen && !expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDocsOpen(false);
        setExpanded(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docsOpen, expanded]);

  const model = detectionModels.find((item) => item.id === modelId) ?? detectionModels[0];
  const appliedModel = detectionModels.find((item) => item.id === applied.modelId) ?? detectionModels[0];
  const catalog = applied.modelId === "e1" ? thermalDetections : rgbDetections;
  const visible = useMemo(
    () =>
      catalog
        .filter((object) => object.confidence >= applied.threshold)
        .slice(0, applied.maxDetections)
        .filter((object) =>
          matchesQuery(query, [
            String(object.id),
            object.className,
            formatConfidence(object.confidence),
            object.box.join(", "),
          ]),
        ),
    [applied.maxDetections, applied.threshold, catalog, query],
  );
  const thermalVisible = thermalDetections.filter((object) => object.confidence >= applied.threshold);

  function assignFile(channel: "rgb" | "thermal", file: File | null) {
    const current = channel === "rgb" ? rgb : thermal;
    const update = channel === "rgb" ? setRgb : setThermal;
    const urlInUse = (url: string) =>
      (applied.rgb.kind === "file" && applied.rgb.url === url) ||
      (applied.thermal.kind === "file" && applied.thermal.url === url);
    const releaseCurrent = () => {
      if (current.kind === "file" && !urlInUse(current.url)) releaseSlot(current);
    };
    if (!file) {
      releaseCurrent();
      update({ kind: "empty" });
      setError("");
      return;
    }
    const allowed = file.type === "image/jpeg" || file.type === "image/png";
    if (!allowed || file.size > MAX_BYTES) {
      setError("Use a JPG or PNG under 10 MB.");
      return;
    }
    releaseCurrent();
    update({ kind: "file", url: URL.createObjectURL(file), name: file.name });
    setError("");
  }

  function runDetection() {
    if (rgb.kind === "empty") {
      setError("RGB image is required.");
      return;
    }
    if (model.status === "Planned") {
      setError("E2 fusion is not available on this screen yet.");
      return;
    }
    setError("");
    setRunning(true);
    window.setTimeout(() => {
      setApplied({
        modelId,
        threshold,
        imageSize,
        iou,
        maxDetections,
        inferenceMs: modelId === "e1" ? 38 : 42,
        rgb,
        thermal,
      });
      setSelectedId(null);
      setTab("visual");
      setRunning(false);
      pushToast("Detection completed");
    }, 700);
  }

  function viewObject(id: number) {
    setSelectedId(id);
    setTab("visual");
    visualRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const payload = {
    status: "completed",
    model: appliedModel.label,
    image_size: Number(applied.imageSize),
    confidence_threshold: applied.threshold,
    iou_threshold: applied.iou,
    max_detections: applied.maxDetections,
    inference_time_ms: applied.inferenceMs,
    detections: visible.map((object) => ({
      id: object.id,
      class: object.className,
      confidence: object.confidence,
      bbox_xyxy: object.box,
    })),
  };

  return (
    <div className="px-4 pb-6 sm:px-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Detection</h1>
          <p className="mt-1 text-sm text-slate-400">
            Upload RGB and/or Thermal images to detect people using AI models
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDocsOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-900"
        >
          <BookOpen className="h-4 w-4" />
          View Documentation
        </button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <Panel className="p-4 sm:p-5">
            <SectionTitle
              icon={<ImageIcon className="h-5 w-5" />}
              title="1. Input Images"
              subtitle="Upload RGB image (required) and optional Thermal image"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <UploadSlot
                title="RGB Image"
                required
                tone="blue"
                slot={rgb}
                onFile={(file) => assignFile("rgb", file)}
                onClear={() => assignFile("rgb", null)}
              />
              <UploadSlot
                title="Thermal Image"
                tone="rose"
                slot={thermal}
                onFile={(file) => assignFile("thermal", file)}
                onClear={() => assignFile("thermal", null)}
              />
            </div>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionTitle
              icon={<SlidersHorizontal className="h-5 w-5" />}
              title="2. Model & Parameters"
              subtitle="Select model and adjust detection settings"
            />
            <div className="mt-4 space-y-4">
              <ModelSelect modelId={modelId} onChange={setModelId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Confidence Threshold</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <input
                        type="range"
                        min={0.1}
                        max={0.9}
                        step={0.01}
                        value={threshold}
                        aria-label="Confidence threshold"
                        onChange={(event) => setThreshold(Number(event.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
                      />
                      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                        <span>0.1</span>
                        <span>0.9</span>
                      </div>
                    </div>
                    <div className="mb-4 w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-100">
                      {formatConfidence(threshold)}
                    </div>
                  </div>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Image Size</span>
                  <span className="relative mt-2 block">
                    <select
                      value={imageSize}
                      onChange={(event) => setImageSize(event.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {imageSizes.map((size) => (
                        <option key={size.id} value={size.id}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </span>
                </label>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((open) => !open)}
                  className="flex w-full items-center justify-between px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200"
                  aria-expanded={advancedOpen}
                >
                  <span className="inline-flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-slate-400" />
                    Advanced Options
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", advancedOpen && "rotate-180")} />
                </button>
                {advancedOpen && (
                  <div className="grid gap-3 border-t border-slate-100 px-3 py-3 sm:grid-cols-2 dark:border-slate-800">
                    <label className="text-xs font-medium text-slate-500">
                      IoU threshold
                      <input
                        type="number"
                        min={0.1}
                        max={0.9}
                        step={0.05}
                        value={iou}
                        onChange={(event) => setIou(Number(event.target.value))}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Max detections
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={maxDetections}
                        onChange={(event) => setMaxDetections(Number(event.target.value))}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>
                  </div>
                )}
              </div>

              {error && <p className="text-sm font-medium text-red-500">{error}</p>}

              <button
                type="button"
                onClick={runDetection}
                disabled={running}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-400"
              >
                <Play className="h-4 w-4 fill-white" />
                {running ? "Running..." : "Run Detection"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </Panel>
        </div>

        <Panel className="overflow-hidden lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Crosshair className="h-4 w-4" />
              </span>
              <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">Detection Result</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  running ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", running ? "bg-amber-500" : "bg-emerald-500")} />
                {running ? "Running" : "Completed"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Inference Time: {applied.inferenceMs} ms</span>
              <Link to="/results/R024" className="font-semibold text-blue-600 hover:underline">
                View in Results
              </Link>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 dark:border-slate-800">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
                    active
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5">
            {tab === "visual" && (
              <div ref={visualRef} className="grid gap-3 sm:grid-cols-2">
                <ResultFrame
                  title="RGB Image (Detections)"
                  mode="rgb"
                  slot={applied.rgb}
                  objects={applied.modelId === "e1" ? [] : visible}
                  selectedId={selectedId}
                  onExpand={() => setExpanded("rgb")}
                />
                <ResultFrame
                  title="Thermal Image (Detections)"
                  mode="thermal"
                  slot={applied.thermal}
                  objects={thermalVisible}
                  selectedId={null}
                  onExpand={() => setExpanded("thermal")}
                />
              </div>
            )}
            {tab === "json" && (
              <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                {JSON.stringify(payload, null, 2)}
              </pre>
            )}
            {tab === "details" && (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Status" value={running ? "Running" : "Completed"} />
                <Detail label="Model" value={appliedModel.label} />
                <Detail label="RGB input" value={applied.rgb.kind === "empty" ? "None" : applied.rgb.name} />
                <Detail label="Thermal input" value={applied.thermal.kind === "empty" ? "None" : applied.thermal.name} />
                <Detail label="Confidence" value={formatConfidence(applied.threshold)} />
                <Detail label="Image size" value={`${applied.imageSize} × ${applied.imageSize}`} />
                <Detail label="IoU" value={applied.iou.toFixed(2)} />
                <Detail label="Inference" value={`${applied.inferenceMs} ms`} />
              </dl>
            )}
            {(tab === "visual" || tab === "objects") && (
              <ObjectTable
                objects={visible}
                selectedId={selectedId}
                onView={viewObject}
                className={tab === "visual" ? "mt-5" : ""}
              />
            )}
          </div>
        </Panel>
      </div>

      {docsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Detection</h2>
              <button
                type="button"
                aria-label="Close documentation"
                onClick={() => setDocsOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>RGB is required. Thermal is optional and shown beside the RGB result.</p>
              <p>E0 reads the visible frame. E1 reads the infrared frame. E2 fusion is not wired on this screen.</p>
              <p>The confidence slider hides boxes below the chosen score. Image size and IoU are sent with the run settings.</p>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-4 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {expanded === "rgb" ? "RGB Image (Detections)" : "Thermal Image (Detections)"}
              </h2>
              <button
                type="button"
                aria-label="Close expanded result"
                onClick={() => setExpanded(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ResultFrame
              title=""
              mode={expanded}
              slot={expanded === "rgb" ? applied.rgb : applied.thermal}
              objects={expanded === "rgb" ? (applied.modelId === "e1" ? [] : visible) : thermalVisible}
              selectedId={expanded === "rgb" ? selectedId : null}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</span>
      <div>
        <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function UploadSlot({
  title,
  required,
  tone,
  slot,
  onFile,
  onClear,
}: {
  title: string;
  required?: boolean;
  tone: "blue" | "rose";
  slot: ImageSlot;
  onFile: (file: File | null) => void;
  onClear: () => void;
}) {
  const inputId = useId();
  const [over, setOver] = useState(false);
  const mode = tone === "blue" ? "rgb" : "thermal";

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}{" "}
        {required ? <span className="text-red-500">*</span> : <span className="font-medium text-slate-400">(Optional)</span>}
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
          "rounded-xl border bg-[#f8fafc] px-3 py-4 text-center dark:bg-slate-950",
          over ? "border-blue-400" : "border-slate-200 dark:border-slate-700",
        )}
      >
        <div
          className={cn(
            "mx-auto grid h-10 w-10 place-items-center rounded-xl",
            tone === "blue" ? "bg-blue-50 text-blue-500" : "bg-rose-50 text-rose-500",
          )}
        >
          {tone === "blue" ? <ImageIcon className="h-5 w-5" /> : <Flame className="h-5 w-5" />}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Drag & drop an image
          <br />
          or click to upload
        </p>
        <label
          htmlFor={inputId}
          className="mt-3 flex h-9 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600 hover:bg-blue-100"
        >
          Choose Image
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(event) => {
            onFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
        <p className="mt-2 text-[11px] text-slate-400">JPG, PNG (Max 10 MB)</p>
      </div>
      {slot.kind !== "empty" && (
        <div className="relative mt-3 overflow-hidden rounded-xl bg-slate-800">
          <div className="h-28">
            {slot.kind === "file" ? (
              <img src={slot.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <AerialScene mode={mode} people={[{ x: 50, y: 52 }]} seed={mode === "rgb" ? 4 : 8} className="h-full w-full" />
            )}
          </div>
          <button
            type="button"
            aria-label={`Remove ${title}`}
            onClick={onClear}
            className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-900/75 text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function ModelSelect({ modelId, onChange }: { modelId: ModelOption["id"]; onChange: (id: ModelOption["id"]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = detectionModels.find((item) => item.id === modelId) ?? detectionModels[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Model Version</div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{current.label}</span>
          <StatusBadge status={current.status} />
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {detectionModels.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className={item.id === modelId ? "font-semibold text-blue-600" : "text-slate-700 dark:text-slate-200"}>
                {item.label}
              </span>
              <StatusBadge status={item.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ModelOption["status"] }) {
  const available = status === "Available";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        available ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", available ? "bg-emerald-500" : "bg-slate-400")} />
      {status}
    </span>
  );
}

function ResultFrame({
  title,
  mode,
  slot,
  objects,
  selectedId,
  onExpand,
}: {
  title: string;
  mode: "rgb" | "thermal";
  slot: ImageSlot;
  objects: DetectedObject[];
  selectedId: number | null;
  onExpand?: () => void;
}) {
  return (
    <div>
      {title && <div className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{title}</div>}
      <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-800">
        {slot.kind === "empty" ? (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-slate-300">No {mode} image</div>
        ) : slot.kind === "file" ? (
          <img src={slot.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <AerialScene mode={mode} people={peopleFrom(objects)} seed={mode === "rgb" ? 4 : 8} className="h-full w-full" />
        )}
        {slot.kind !== "empty" &&
          objects.map((object) => (
            <div
              key={object.id}
              className={cn(
                "absolute border-2 border-red-500",
                selectedId === object.id && "ring-2 ring-blue-500 ring-offset-1",
              )}
              style={{
                left: `${object.frame.x}%`,
                top: `${object.frame.y}%`,
                width: `${object.frame.w}%`,
                height: `${object.frame.h}%`,
              }}
            >
              <span className="absolute -top-5 left-0 whitespace-nowrap bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                person {formatConfidence(object.confidence)}
              </span>
            </div>
          ))}
        {onExpand && slot.kind !== "empty" && (
          <button
            type="button"
            aria-label={`Expand ${title}`}
            onClick={onExpand}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-slate-900/55 text-white"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ObjectTable({
  objects,
  selectedId,
  onView,
  className,
}: {
  objects: DetectedObject[];
  selectedId: number | null;
  onView: (id: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <Users className="h-3.5 w-3.5" />
        </span>
        Detected Objects ({objects.length})
      </div>
      {objects.length === 0 ? (
        <p className="text-sm text-slate-400">No objects match this confidence or search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Class</th>
                <th className="pb-2 font-medium">Confidence</th>
                <th className="pb-2 font-medium">Bounding Box (x1, y1, x2, y2)</th>
                <th className="pb-2 font-medium" />
                <th className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {objects.map((object, index) => (
                <tr
                  key={object.id}
                  className={cn("border-t border-slate-100 dark:border-slate-800", selectedId === object.id && "bg-blue-50/70 dark:bg-blue-950/40")}
                >
                  <td className="py-2.5 text-slate-400">{index + 1}</td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-200">{object.className}</td>
                  <td className="py-2.5">
                    <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", confidenceTone(object.confidence))}>
                      {formatConfidence(object.confidence)}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-xs text-slate-500">({object.box.join(", ")})</td>
                  <td className="py-2.5">
                    <div className="h-9 w-9 overflow-hidden rounded-md bg-slate-800">
                      <AerialScene mode="thumb" people={[{ x: 50, y: 48 }]} seed={object.seed} className="h-full w-full" />
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onView(object.id)}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
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
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}
