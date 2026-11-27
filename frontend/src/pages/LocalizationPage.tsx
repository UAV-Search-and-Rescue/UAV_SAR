import { Crosshair, ExternalLink, MapPin, Mountain, Navigation, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfBadge, EmptyState, Panel } from "../components/ui";
import { useLiveSession } from "../context/LiveSessionContext";
import { useUi } from "../context/UiContext";
import { API_BASE_URL, getDetectedFrames, type DetectedFrame } from "../lib/api";

export function LocalizationPage() {
  const { query } = useUi();
  const {
    sessionId,
    sessionStatus,
    droneLat,
    setDroneLat,
    droneLon,
    setDroneLon,
    droneAlt,
    setDroneAlt,
    droneYaw,
    setDroneYaw,
    applyDroneConfig,
  } = useLiveSession();

  const [frames, setFrames] = useState<DetectedFrame[]>([]);

  const loadFrames = () => {
    getDetectedFrames().then(setFrames).catch(() => {});
  };

  useEffect(() => {
    loadFrames();
    const timer = window.setInterval(loadFrames, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const allDetections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return frames
      .flatMap((f) =>
        f.detections.map((d, idx) => ({
          ...d,
          indexInFrame: idx + 1,
          inferenceMs: f.inference_ms,
        })),
      )
      .filter((d) => {
        if (!needle) return true;
        const gps =
          d.latitude !== null && d.longitude !== null
            ? `${d.latitude.toFixed(5)} ${d.longitude.toFixed(5)}`
            : "gps unavailable";
        return [`frame ${d.frame_number}`, `${Math.round(d.confidence * 100)}%`, gps]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [frames, query]);

  const geoTaggedCount = allDetections.filter(
    (d) => d.latitude !== null && d.longitude !== null,
  ).length;
  const gsd = sessionStatus?.gsd;
  const hasTelemetry = Boolean(
    droneLat && droneLon && parseFloat(droneAlt) > 0,
  );

  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--sar-text-1)" }}>
            Target Localization
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--sar-text-2)" }}>
            Real-time target geo-coordinates computed from drone telemetry and detected bounding boxes
          </p>
        </div>
        <button
          type="button"
          onClick={loadFrames}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold"
          style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sar-text-3)" }}>
            <Crosshair className="h-3.5 w-3.5" style={{ color: "var(--sar-teal)" }} />
            Detected Targets
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold" style={{ color: "var(--sar-text-1)" }}>
            {allDetections.length}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--sar-text-3)" }}>
            {geoTaggedCount} with GPS coordinates
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sar-text-3)" }}>
            <Navigation className="h-3.5 w-3.5" style={{ color: "var(--sar-blue)" }} />
            Telemetry Status
          </div>
          <div className="mt-1.5 text-lg font-bold" style={{ color: hasTelemetry ? "var(--sar-green)" : "var(--sar-amber)" }}>
            {hasTelemetry ? "Configured" : "GPS Unavailable"}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--sar-text-3)" }}>
            {hasTelemetry ? `${droneLat}, ${droneLon} @ ${droneAlt}m` : "Enter drone GPS below to compute coordinates"}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sar-text-3)" }}>
            <Mountain className="h-3.5 w-3.5" style={{ color: "var(--sar-amber)" }} />
            Ground Sampling Distance
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold" style={{ color: "var(--sar-text-1)" }}>
            {gsd !== null && gsd !== undefined ? `${gsd} cm/px` : "—"}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--sar-text-3)" }}>
            Ray-ground projection (640×640)
          </div>
        </Panel>
      </div>

      {/* Drone Telemetry Config */}
      <Panel className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>
              Drone Telemetry Input (Optional)
            </h2>
            <p className="text-xs" style={{ color: "var(--sar-text-3)" }}>
              Provide UAV coordinates and altitude to project pixel detections into latitude/longitude
            </p>
          </div>
          {sessionId && (
            <button
              type="button"
              onClick={() => void applyDroneConfig()}
              className="h-8 rounded-lg px-3.5 text-xs font-semibold text-white"
              style={{ background: "var(--sar-teal)" }}
            >
              Apply to Active Session
            </button>
          )}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-4">
          <label className="block text-[11px] font-medium" style={{ color: "var(--sar-text-3)" }}>
            Latitude
            <input
              type="number" step="any" placeholder="e.g. 28.6139" value={droneLat}
              onChange={(e) => setDroneLat(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg px-2.5 text-xs outline-none"
              style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
            />
          </label>
          <label className="block text-[11px] font-medium" style={{ color: "var(--sar-text-3)" }}>
            Longitude
            <input
              type="number" step="any" placeholder="e.g. 77.2090" value={droneLon}
              onChange={(e) => setDroneLon(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg px-2.5 text-xs outline-none"
              style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
            />
          </label>
          <label className="block text-[11px] font-medium" style={{ color: "var(--sar-text-3)" }}>
            Altitude (m)
            <input
              type="number" step="any" placeholder="e.g. 50" value={droneAlt}
              onChange={(e) => setDroneAlt(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg px-2.5 text-xs outline-none"
              style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
            />
          </label>
          <label className="block text-[11px] font-medium" style={{ color: "var(--sar-text-3)" }}>
            Yaw (deg)
            <input
              type="number" step="any" placeholder="0" value={droneYaw}
              onChange={(e) => setDroneYaw(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg px-2.5 text-xs outline-none"
              style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
            />
          </label>
        </div>
      </Panel>

      {/* Real Localized Detections Table */}
      <Panel className="overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--sar-border)" }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: "var(--sar-teal)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>
              Localized Detections ({allDetections.length})
            </h2>
          </div>
        </div>

        {allDetections.length === 0 ? (
          <div className="p-8">
            <EmptyState message="No detections recorded yet. Start monitoring on the Dashboard to view target localization data." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--sar-surface-2)", borderBottom: "1px solid var(--sar-border)", color: "var(--sar-text-3)" }}>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Crop</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Frame</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Confidence</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Bounding Box (px)</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Coordinates</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider">Map Link</th>
                </tr>
              </thead>
              <tbody>
                {allDetections.map((det) => {
                  const hasGps = det.latitude !== null && det.longitude !== null;
                  return (
                    <tr key={det.detection_id} style={{ borderBottom: "1px solid var(--sar-border)" }}>
                      <td className="px-4 py-2">
                        <img
                          src={`${API_BASE_URL}${det.crop_url}`}
                          alt={`Target ${det.indexInFrame}`}
                          className="h-9 w-9 rounded bg-black object-cover"
                        />
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold" style={{ color: "var(--sar-text-1)" }}>
                        #{det.frame_number} ({det.video_time_seconds.toFixed(1)}s)
                      </td>
                      <td className="px-4 py-2"><ConfBadge confidence={det.confidence} /></td>
                      <td className="px-4 py-2 font-mono text-[11px]" style={{ color: "var(--sar-text-3)" }}>
                        ({Math.round(det.bbox.x1)}, {Math.round(det.bbox.y1)})–({Math.round(det.bbox.x2)}, {Math.round(det.bbox.y2)})
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px]" style={{ color: hasGps ? "var(--sar-teal)" : "var(--sar-text-3)" }}>
                        {hasGps ? `${det.latitude!.toFixed(5)}, ${det.longitude!.toFixed(5)}` : "GPS unavailable"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {hasGps ? (
                          <a
                            href={`https://maps.google.com/?q=${det.latitude},${det.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold"
                            style={{ background: "var(--sar-teal-dim)", color: "var(--sar-teal)" }}
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span style={{ color: "var(--sar-text-3)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
