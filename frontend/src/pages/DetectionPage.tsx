import {
  Braces,
  Crosshair,
  Image as ImageIcon,
  Info,
  Maximize2,
  Play,
  RefreshCw,
  Square,
  Table2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConfBadge, EmptyState, Panel } from "../components/ui";
import { useUi } from "../context/UiContext";
import { API_BASE_URL, getDetectedFrames, type DetectedFrame } from "../lib/api";
import { cn } from "../lib/cn";

type ResultTab = "visual" | "objects" | "json" | "details";

const tabs: { id: ResultTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "visual", label: "Visual Result", icon: ImageIcon },
  { id: "objects", label: "Detected Objects", icon: Table2 },
  { id: "json", label: "JSON Response", icon: Braces },
  { id: "details", label: "Details", icon: Info },
];

export function DetectionPage() {
  const { query } = useUi();
  const [frames, setFrames] = useState<DetectedFrame[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [tab, setTab] = useState<ResultTab>("visual");
  const [expanded, setExpanded] = useState<"rgb" | "thermal" | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const loadFrames = () => {
    getDetectedFrames()
      .then((rows) => {
        setFrames(rows);
        setSelectedFrameId((prev) =>
          prev && rows.some((r) => r.frame_id === prev) ? prev : rows[0]?.frame_id ?? null,
        );
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadFrames();
  }, []);

  useEffect(() => {
    if (!isPolling) return;
    loadFrames();
    const timer = window.setInterval(loadFrames, 1500);
    return () => window.clearInterval(timer);
  }, [isPolling]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const filteredFrames = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return frames;
    return frames.filter((f) =>
      [
        `frame ${f.frame_number}`,
        f.model,
        `${Math.round(f.top_confidence * 100)}%`,
        `${f.person_count} person`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [frames, query]);

  const selected =
    filteredFrames.find((f) => f.frame_id === selectedFrameId) ?? filteredFrames[0] ?? null;

  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--sar-text-1)" }}>
            Detection Results
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--sar-text-2)" }}>
            Actual frames from Dashboard monitoring where persons were detected
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-base badge-teal">{frames.length} detected frame(s)</span>
          <button
            type="button"
            onClick={() => setIsPolling((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: isPolling ? "var(--sar-red)" : "var(--sar-teal)" }}
          >
            {isPolling ? (
              <>
                <Square className="h-3 w-3 fill-current" /> Stop
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" /> Start
              </>
            )}
          </button>
          <button
            type="button"
            onClick={loadFrames}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link
            to="/"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {!selected ? (
        <Panel className="p-8">
          <EmptyState message="No person detections recorded yet. Run a dataset image sequence or video on the Dashboard to capture detected frames." />
        </Panel>
      ) : (
        <div className="space-y-4">
          {/* Strip of frames where persons were detected */}
          <Panel className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--sar-text-3)" }}>
                Frames With Person Detections
              </span>
              <span className="text-[11px]" style={{ color: "var(--sar-text-3)" }}>
                Click a frame to inspect
              </span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {filteredFrames.map((f) => {
                const active = f.frame_id === selected.frame_id;
                return (
                  <button
                    key={f.frame_id}
                    type="button"
                    onClick={() => setSelectedFrameId(f.frame_id)}
                    className="w-40 shrink-0 overflow-hidden rounded-xl text-left transition-all"
                    style={{
                      background: "var(--sar-surface-2)",
                      border: active ? "2px solid var(--sar-teal)" : "1px solid var(--sar-border)",
                    }}
                  >
                    <div className="relative aspect-video bg-black">
                      <img
                        src={`${API_BASE_URL}${f.rgb_frame_url}`}
                        alt={`Frame ${f.frame_number}`}
                        className="h-full w-full object-cover"
                      />
                      <span
                        className="absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-white"
                        style={{ background: "rgba(0,0,0,0.75)" }}
                      >
                        {f.person_count}p
                      </span>
                    </div>
                    <div className="px-2 py-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "var(--sar-text-1)" }}>
                        <span className="font-mono">Frame #{f.frame_number}</span>
                        <span className="font-mono text-[11px]" style={{ color: "var(--sar-teal)" }}>
                          {Math.round(f.top_confidence * 100)}%
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px]" style={{ color: "var(--sar-text-3)" }}>
                        {f.video_time_seconds.toFixed(1)}s · {f.inference_ms} ms
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Full-width Detection Result */}
          <Panel className="overflow-hidden">
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid var(--sar-border)" }}
            >
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4" style={{ color: "var(--sar-teal)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>
                  Detection Result — Frame #{selected.frame_number}
                </h2>
                <span className="badge-base badge-green">
                  {selected.person_count} person(s) detected
                </span>
              </div>
              <span className="font-mono text-xs" style={{ color: "var(--sar-text-3)" }}>
                Inference Time: {selected.inference_ms} ms · {selected.model}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto px-4 pt-3" style={{ borderBottom: "1px solid var(--sar-border)" }}>
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn("flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold")}
                    style={{
                      borderColor: active ? "var(--sar-teal)" : "transparent",
                      color: active ? "var(--sar-teal)" : "var(--sar-text-3)",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              {tab === "visual" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div
                      className="overflow-hidden rounded-xl"
                      style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}
                    >
                      <div
                        className="flex items-center justify-between px-3 py-2"
                        style={{ borderBottom: "1px solid var(--sar-border)" }}
                      >
                        <span className="text-xs font-semibold" style={{ color: "var(--sar-text-1)" }}>
                          RGB Image (Detections)
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpanded("rgb")}
                          className="rounded p-1 hover:opacity-75"
                          style={{ color: "var(--sar-text-3)" }}
                          aria-label="Expand RGB detection frame"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="aspect-video bg-black">
                        <img
                          src={`${API_BASE_URL}${selected.rgb_frame_url}`}
                          alt={`RGB detection frame ${selected.frame_number}`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>

                    <div
                      className="overflow-hidden rounded-xl"
                      style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}
                    >
                      <div
                        className="flex items-center justify-between px-3 py-2"
                        style={{ borderBottom: "1px solid var(--sar-border)" }}
                      >
                        <span className="text-xs font-semibold" style={{ color: "var(--sar-text-1)" }}>
                          Thermal Image (Detections)
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpanded("thermal")}
                          className="rounded p-1 hover:opacity-75"
                          style={{ color: "var(--sar-text-3)" }}
                          aria-label="Expand thermal detection frame"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="aspect-video bg-black">
                        <img
                          src={`${API_BASE_URL}${selected.thermal_frame_url}`}
                          alt={`Thermal detection frame ${selected.frame_number}`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detected Objects summary under Visual Result */}
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--sar-text-3)" }}>
                      Detected Objects ({selected.detections.length})
                    </h3>
                    <DetectedObjectsTable detections={selected.detections} />
                  </div>
                </div>
              )}

              {tab === "objects" && <DetectedObjectsTable detections={selected.detections} />}

              {tab === "json" && (
                <pre
                  className="max-h-96 overflow-auto rounded-xl p-4 font-mono text-xs"
                  style={{ background: "#05070c", color: "var(--sar-teal)", border: "1px solid var(--sar-border)" }}
                >
                  {JSON.stringify(selected, null, 2)}
                </pre>
              )}

              {tab === "details" && (
                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <DetailItem label="Frame Number" value={`#${selected.frame_number}`} />
                  <DetailItem label="Video / Sequence Time" value={`${selected.video_time_seconds.toFixed(2)} s`} />
                  <DetailItem label="Model" value={selected.model} />
                  <DetailItem label="Inference Latency" value={`${selected.inference_ms} ms`} />
                  <DetailItem label="Persons Detected" value={String(selected.person_count)} />
                  <DetailItem label="Session ID" value={selected.session_id} />
                </dl>
              )}
            </div>
          </Panel>
        </div>
      )}

      {expanded && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setExpanded(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl p-3"
            style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border-2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>
                Frame #{selected.frame_number} — {expanded === "rgb" ? "RGB Detection" : "Thermal Detection"}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="grid h-8 w-8 place-items-center rounded-lg"
                style={{ color: "var(--sar-text-2)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={`${API_BASE_URL}${expanded === "rgb" ? selected.rgb_frame_url : selected.thermal_frame_url}`}
              alt="Expanded detection frame"
              className="max-h-[80vh] w-full rounded-xl bg-black object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DetectedObjectsTable({ detections }: { detections: DetectedFrame["detections"] }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--sar-border)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--sar-surface-2)", borderBottom: "1px solid var(--sar-border)", color: "var(--sar-text-3)" }}>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">#</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Class</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Confidence</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Bounding Box (x1, y1, x2, y2)</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">GPS</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Crop</th>
          </tr>
        </thead>
        <tbody>
          {detections.map((det, idx) => (
            <tr key={det.detection_id} style={{ borderBottom: "1px solid var(--sar-border)" }}>
              <td className="px-3 py-2 font-mono" style={{ color: "var(--sar-text-2)" }}>{idx + 1}</td>
              <td className="px-3 py-2 font-semibold" style={{ color: "var(--sar-text-1)" }}>{det.class_name}</td>
              <td className="px-3 py-2"><ConfBadge confidence={det.confidence} /></td>
              <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--sar-text-3)" }}>
                ({Math.round(det.bbox.x1)}, {Math.round(det.bbox.y1)}, {Math.round(det.bbox.x2)}, {Math.round(det.bbox.y2)})
              </td>
              <td className="px-3 py-2 text-[11px]" style={{ color: "var(--sar-text-3)" }}>
                {det.latitude !== null && det.longitude !== null
                  ? `${det.latitude.toFixed(5)}, ${det.longitude.toFixed(5)}`
                  : "GPS unavailable"}
              </td>
              <td className="px-3 py-2">
                <img
                  src={`${API_BASE_URL}${det.crop_url}`}
                  alt={`Person ${idx + 1}`}
                  className="h-9 w-9 rounded bg-black object-cover"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sar-text-3)" }}>{label}</dt>
      <dd className="mt-1 font-mono text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>{value}</dd>
    </div>
  );
}
