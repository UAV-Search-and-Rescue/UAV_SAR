import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Download,
  Expand,
  Map as MapIcon,
  MapPin,
  Minus,
  Mountain,
  Navigation,
  Plus,
  Ruler,
  Satellite,
  Square,
  Target,
  Trees,
  X,
} from "lucide-react";
import { AerialScene } from "../components/dashboard/AerialScene";
import { MissingRecord } from "../components/ui";
import { UavMark } from "../components/icons";
import { useUi } from "../context/UiContext";
import {
  flightProfile,
  flightSummary,
  formatDegrees,
  locatedTargets,
  locationById,
  pinKind,
  type LocatedTarget,
} from "../data/locations";
import { cn } from "../lib/cn";

const PAGE_SIZE = 5;

const areaPath = "M16 70 L30 42 L48 24 L70 22 L84 42 L80 70 L58 84 L28 80 Z";
const routePath = "M22 58 L40 46 L47 46 L56 48 L72 38 L60 66 L49 70";

function formatRangeDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatStamp(target: LocatedTarget) {
  const date = new Date(`${target.date}T12:00:00`);
  const day = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${day}, ${target.time}`;
}

function confidenceClass(value: number) {
  if (value >= 0.85) return "bg-rose-100 text-rose-600";
  if (value >= 0.75) return "bg-orange-100 text-orange-600";
  return "bg-amber-100 text-amber-700";
}

function confidenceLabel(value: number) {
  if (value >= 0.85) return "High Confidence";
  if (value >= 0.75) return "Medium Confidence";
  return "Low Confidence";
}

function downloadTarget(target: LocatedTarget) {
  const blob = new Blob([JSON.stringify(target, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${target.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function LocalizationPage() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { query, setQuery, pushToast } = useUi();
  const [from, setFrom] = useState("2026-10-10");
  const [to, setTo] = useState("2026-10-16");
  const [basemap, setBasemap] = useState("satellite");
  const [showDetections, setShowDetections] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [detailTab, setDetailTab] = useState<"location" | "image" | "metadata">("location");
  const [chartTab, setChartTab] = useState<"path" | "elevation">("elevation");
  const [hoverKm, setHoverKm] = useState(1.2);
  const [tableQuery, setTableQuery] = useState("");
  const [band, setBand] = useState("all");
  const [page, setPage] = useState(1);

  const selected = locationId ? locationById(locationId) : locatedTargets[0];

  const inRange = useMemo(
    () => locatedTargets.filter((item) => item.date >= from && item.date <= to),
    [from, to],
  );

  const filtered = useMemo(() => {
    const header = query.trim().toLowerCase();
    const local = tableQuery.trim().toLowerCase();
    return inRange.filter((item) => {
      const kind = pinKind(item.confidence);
      if (band === "high" && kind !== "high") return false;
      if (band === "medium" && kind !== "medium") return false;
      if (band === "low" && kind !== "low") return false;
      const haystack = [item.id, item.latitude, item.longitude, item.locationType, item.time, item.model]
        .join(" ")
        .toLowerCase();
      if (header && !haystack.includes(header)) return false;
      if (local && !haystack.includes(local)) return false;
      return true;
    });
  }, [inRange, query, tableQuery, band]);

  useEffect(() => {
    if (!locationId) return;
    const index = locatedTargets.findIndex((item) => item.id.toLowerCase() === locationId.toLowerCase());
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1);
    else setDetailsOpen(true);
  }, [locationId]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const located = inRange.filter((item) => item.gps).length;
  const hovered = flightProfile.reduce((best, point) =>
    Math.abs(point.km - hoverKm) < Math.abs(best.km - hoverKm) ? point : best,
  );

  function openTarget(target: LocatedTarget) {
    setDetailsOpen(true);
    setDetailTab("location");
    navigate(`/localization/${target.id}`);
  }

  function viewOnMap() {
    document.getElementById("search-area-map")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-800 dark:text-slate-50">Localization</h1>
          <p className="text-sm text-slate-400">View detected persons on map with estimated locations and UAV metadata</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateField label="From" value={from} onChange={(value) => { setFrom(value); setPage(1); }} />
          <span className="text-slate-300">–</span>
          <DateField label="To" value={to} onChange={(value) => { setTo(value); setPage(1); }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total Detections"
          value={String(inRange.length)}
          delta="↑ 12%"
          note="in selected time range"
          icon={<MapPin className="h-5 w-5" />}
          iconClass="bg-rose-50 text-rose-500"
          deltaClass="text-rose-500"
        />
        <Stat
          label="Located Targets"
          value={String(located)}
          delta="↑ 75%"
          note="with GPS estimate"
          icon={<Target className="h-5 w-5" />}
          iconClass="bg-emerald-50 text-emerald-500"
          deltaClass="text-emerald-500"
        />
        <Stat
          label="UAV Flights"
          value="4"
          delta="↑ 2 active"
          note="total missions"
          icon={<UavMark className="h-5 w-5" />}
          iconClass="bg-sky-50 text-sky-500"
          deltaClass="text-sky-500"
        />
        <Stat
          label="Area Covered"
          value="2.8 km²"
          note="search area (approx.)"
          icon={<MapIcon className="h-5 w-5" />}
          iconClass="bg-violet-50 text-violet-500"
        />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-12">
        <section
          id="search-area-map"
          className={cn(
            "overflow-hidden rounded-2xl border border-[#e6edf5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900",
            detailsOpen ? "lg:col-span-8" : "lg:col-span-12",
          )}
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-[#eef3f8] px-4 py-3 dark:border-slate-800">
            <MapIcon className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Search Area Map</h2>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <label className="relative">
                <select
                  aria-label="Basemap"
                  value={basemap}
                  onChange={(event) => setBasemap(event.target.value)}
                  className="h-8 appearance-none rounded-lg border border-[#e6edf5] bg-white pl-2 pr-7 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="satellite">Satellite</option>
                  <option value="map">Map</option>
                </select>
                <ChevronRight className="pointer-events-none absolute right-1.5 top-2 h-3.5 w-3.5 rotate-90 text-slate-400" />
              </label>
              <CheckLabel checked={showDetections} onChange={setShowDetections} label="Show Detections" />
              <CheckLabel checked={showRoute} onChange={setShowRoute} label="UAV Route" />
              <CheckLabel checked={showHeatmap} onChange={setShowHeatmap} label="Heatmap" />
              <button
                type="button"
                aria-label={expanded ? "Collapse map" : "Expand map"}
                onClick={() => setExpanded((value) => !value)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
              >
                <Expand className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className={cn("relative overflow-hidden bg-[#14331d]", expanded ? "h-[640px]" : "h-[460px]")}>
            <div className="absolute inset-0 origin-center transition-transform" style={{ transform: `scale(${zoom})` }}>
              <AerialScene mode="map" seed={15} className="h-full w-full" />
              {basemap === "map" && (
                <div className="absolute inset-0 bg-[#e8f2e4]/80">
                  <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: 8 }, (_, index) => (
                      <line key={index} x1={index * 14} y1="0" x2={index * 14} y2="100" stroke="#94a3b8" strokeWidth="0.2" />
                    ))}
                  </svg>
                </div>
              )}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d={areaPath} fill="rgba(37,99,235,0.16)" stroke="#60a5fa" strokeWidth="0.6" />
                {showRoute && (
                  <path d={routePath} fill="none" stroke="#93c5fd" strokeWidth="0.7" strokeDasharray="1.6 1.1" strokeLinejoin="round" />
                )}
              </svg>
              {showHeatmap &&
                filtered
                  .filter((item) => item.map)
                  .map((item) => (
                    <span
                      key={`heat-${item.id}`}
                      className="absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/35 blur-md"
                      style={{ left: `${item.map!.x}%`, top: `${item.map!.y}%` }}
                    />
                  ))}
              {showRoute && (
                <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "22%", top: "58%" }}>
                  <UavMark className="h-7 w-7 text-sky-300 drop-shadow" />
                  <span className="absolute left-7 top-1 whitespace-nowrap rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    UAV-01
                  </span>
                </div>
              )}
              {showDetections &&
                filtered
                  .filter((item) => item.map)
                  .map((item) => (
                    <MapMarker
                      key={item.id}
                      target={item}
                      active={item.id === selected?.id}
                      onClick={() => openTarget(item)}
                    />
                  ))}
            </div>

            {legendOpen && (
              <div className="absolute left-3 top-3 w-44 rounded-xl bg-slate-950/80 p-3 text-[11px] text-slate-100 shadow-lg">
                <LegendRow swatch={<span className="h-2.5 w-2.5 rounded-full bg-red-500" />} label="Detected Person" />
                <LegendRow swatch={<span className="h-2.5 w-2.5 rounded-full bg-red-500" />} label="High Confidence" />
                <LegendRow swatch={<span className="h-2.5 w-2.5 rounded-full bg-orange-400" />} label="Medium Confidence" />
                <LegendRow swatch={<span className="h-2.5 w-2.5 rounded-full bg-amber-300" />} label="Low Confidence" />
                <LegendRow swatch={<UavMark className="h-3.5 w-3.5 text-sky-300" />} label="UAV Position" />
                <LegendRow swatch={<span className="h-0 w-4 border-t border-dashed border-sky-300" />} label="Search Route" />
                <LegendRow swatch={<span className="h-2.5 w-3 rounded-sm border border-sky-300" />} label="Search Area" />
              </div>
            )}

            <div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-600 shadow">
              <div className="flex h-2 w-36 overflow-hidden rounded-sm border border-slate-700">
                <span className="w-1/4 bg-white" />
                <span className="w-1/4 bg-slate-800" />
                <span className="w-1/4 bg-white" />
                <span className="w-1/4 bg-slate-800" />
              </div>
              <div className="mt-0.5 flex justify-between">
                <span>0</span>
                <span>250</span>
                <span>500</span>
                <span>1,000 m</span>
              </div>
            </div>

            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <MapButton label="Compass" onClick={() => setZoom(1)}>
                <Navigation className="h-4 w-4" />
              </MapButton>
            </div>
            <div className="absolute bottom-16 right-3 flex flex-col overflow-hidden rounded-lg bg-white shadow">
              <MapButton label="Toggle legend" onClick={() => setLegendOpen((value) => !value)}>
                <Square className="h-3.5 w-3.5" />
              </MapButton>
              <MapButton label="Zoom in" onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.15).toFixed(2))))}>
                <Plus className="h-4 w-4" />
              </MapButton>
              <MapButton label="Zoom out" onClick={() => setZoom((value) => Math.max(1, Number((value - 0.15).toFixed(2))))}>
                <Minus className="h-4 w-4" />
              </MapButton>
            </div>
          </div>
        </section>

        {detailsOpen && (
          <section className="flex flex-col rounded-2xl border border-[#e6edf5] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Target Location Details</h2>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setDetailsOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!selected ? (
              <MissingRecord kind="location" id={locationId ?? ""} onBack={() => navigate("/localization")} />
            ) : (
            <>
            <div className="mt-3 flex gap-3">
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                <AerialScene
                  mode="rgb"
                  seed={selected.seed}
                  people={[{ x: 50, y: 48 }]}
                  className="h-full w-full"
                />
                <span className="absolute left-[38%] top-[22%] h-[48%] w-[24%] border-2 border-red-500">
                  <span className="absolute -top-4 left-0 whitespace-nowrap bg-red-500 px-1 text-[9px] font-semibold text-white">
                    person {selected.confidence.toFixed(2)}
                  </span>
                </span>
              </div>
              <div className="min-w-0 text-sm">
                <div className={cn("text-xs font-semibold", selected.confidence >= 0.85 ? "text-rose-500" : "text-orange-500")}>
                  {confidenceLabel(selected.confidence)}
                </div>
                <div className="mt-1 font-semibold text-slate-800 dark:text-slate-100">#{selected.id}</div>
                <div className="text-xs text-slate-400">{formatStamp(selected)}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <UavMark className="h-3.5 w-3.5 text-blue-500" />
                  {selected.model}
                </div>
                <div className="text-xs text-slate-500">Confidence: {selected.confidence.toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-4 flex gap-4 border-b border-[#eef3f8] text-sm dark:border-slate-800">
              {(
                [
                  ["location", "Location"],
                  ["image", "Image"],
                  ["metadata", "Metadata"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDetailTab(id)}
                  className={cn(
                    "-mb-px border-b-2 px-1 pb-2",
                    detailTab === id ? "border-blue-600 font-semibold text-blue-600" : "border-transparent text-slate-400",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 min-h-0 flex-1">
              {detailTab === "location" && (
                <dl className="space-y-2.5 text-sm">
                  <DetailRow icon={<MapPin className="h-4 w-4" />} label="Latitude" value={formatDegrees(selected.latitude, "N")} />
                  <DetailRow icon={<MapPin className="h-4 w-4" />} label="Longitude" value={formatDegrees(selected.longitude, "E")} />
                  <DetailRow icon={<Mountain className="h-4 w-4" />} label="Altitude (UAV)" value={`${selected.altitudeM} m`} />
                  <DetailRow
                    icon={<Crosshair className="h-4 w-4" />}
                    label="Estimated Ground Location"
                    value={`${formatDegrees(selected.groundLatitude, "N")}, ${formatDegrees(selected.groundLongitude, "E")}`}
                  />
                  <DetailRow icon={<Trees className="h-4 w-4" />} label="Location Type" value={selected.locationType} />
                  <DetailRow icon={<Satellite className="h-4 w-4" />} label="GPS Estimate" value={selected.gps ? "Available" : "Unavailable"} />
                  <DetailRow icon={<Square className="h-4 w-4" />} label="Area" value={`${selected.distanceM} m`} />
                  <DetailRow icon={<Ruler className="h-4 w-4" />} label="Distance from UAV" value={`${selected.distanceM} m`} />
                </dl>
              )}
              {detailTab === "image" && (
                <div className="relative overflow-hidden rounded-xl bg-slate-900">
                  <AerialScene mode="rgb" seed={selected.seed} people={[{ x: 50, y: 46 }]} className="aspect-[16/10] w-full" />
                  <span className="absolute left-[42%] top-[28%] h-[36%] w-[16%] border-2 border-red-500">
                    <span className="absolute -top-5 left-0 whitespace-nowrap bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      person {selected.confidence.toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
              {detailTab === "metadata" && (
                <dl className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <Meta label="Detection ID" value={selected.id} />
                  <Meta label="Model" value={selected.model} />
                  <Meta label="Confidence" value={selected.confidence.toFixed(2)} />
                  <Meta label="Captured" value={formatStamp(selected)} />
                  <Meta label="GPS" value={selected.gps ? "Estimate available" : "No GPS estimate"} />
                  <Meta label="Altitude" value={`${selected.altitudeM} m`} />
                </dl>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={viewOnMap}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <MapPin className="h-4 w-4" />
                View on Map
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadTarget(selected);
                  pushToast(`Downloaded ${selected.id}`);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e6edf5] text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                <Download className="h-4 w-4" />
                Download Data
              </button>
            </div>
            </>
            )}
          </section>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <section className="overflow-hidden rounded-2xl border border-[#e6edf5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Target className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Detected Locations ({filtered.length})
            </h2>
            <label className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
              <input
                aria-label="Search ID or location"
                value={tableQuery}
                onChange={(event) => {
                  setTableQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search ID or location..."
                className="h-9 w-full rounded-xl border border-[#e6edf5] bg-[#f8fafc] pl-3 pr-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <select
              aria-label="Detection filter"
              value={band}
              onChange={(event) => {
                setBand(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-[#e6edf5] bg-white px-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="all">All Detections</option>
              <option value="high">High Confidence</option>
              <option value="medium">Medium Confidence</option>
              <option value="low">Low Confidence</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr className="border-y border-[#eef3f8] dark:border-slate-800">
                  {["#", "Thumbnail", "ID", "Latitude", "Longitude", "Confidence", "Distance (m)", "Time", "Actions"].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((item, index) => {
                  const active = item.id === selected?.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => openTarget(item)}
                      className={cn("cursor-pointer border-b border-[#f3f6fb] dark:border-slate-800", active ? "bg-[#f3f8ff]" : "hover:bg-slate-50 dark:hover:bg-slate-800")}
                    >
                      <td className="px-3 py-2.5 text-slate-400">{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-3 py-2">
                        <span className="block h-9 w-12 overflow-hidden rounded-md bg-slate-800">
                          <AerialScene mode="thumb" seed={item.seed} people={[{ x: 50, y: 48 }]} className="h-full w-full" />
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-100">{item.id}</td>
                      <td className="px-3 py-2 text-slate-500">{item.latitude.toFixed(4)}</td>
                      <td className="px-3 py-2 text-slate-500">{item.longitude.toFixed(4)}</td>
                      <td className="px-3 py-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", confidenceClass(item.confidence))}>
                          {item.confidence.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{item.distanceM}</td>
                      <td className="px-3 py-2 text-slate-500">{item.time}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            aria-label={`Show ${item.id} on map`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openTarget(item);
                              viewOnMap();
                            }}
                            className="grid h-7 w-7 place-items-center rounded-lg text-blue-500 hover:bg-blue-50"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Download ${item.id}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              downloadTarget(item);
                              pushToast(`Downloaded ${item.id}`);
                            }}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                      No locations in this view.
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setTableQuery("");
                          setBand("all");
                          setPage(1);
                        }}
                        className="ml-2 font-medium text-blue-600"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-center gap-1 py-3">
            <Pager label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Pager>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                className={cn(
                  "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm",
                  item === safePage ? "bg-blue-600 font-semibold text-white" : "text-slate-500 hover:bg-slate-50",
                )}
              >
                {item}
              </button>
            ))}
            <Pager label="Next page" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Pager>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6edf5] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">UAV Flight Path & Elevation</h2>
          <div className="mt-3 flex gap-4 border-b border-[#eef3f8] text-sm dark:border-slate-800">
            <button
              type="button"
              onClick={() => setChartTab("path")}
              className={cn("-mb-px border-b-2 pb-2", chartTab === "path" ? "border-blue-600 font-semibold text-blue-600" : "border-transparent text-slate-400")}
            >
              Path on Map
            </button>
            <button
              type="button"
              onClick={() => setChartTab("elevation")}
              className={cn("-mb-px border-b-2 pb-2", chartTab === "elevation" ? "border-blue-600 font-semibold text-blue-600" : "border-transparent text-slate-400")}
            >
              Elevation Profile
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <MiniStat label="Total Distance" value={flightSummary.distance} />
            <MiniStat label="Max Altitude" value={flightSummary.maxAltitude} />
            <MiniStat label="Avg Altitude" value={flightSummary.avgAltitude} />
            <MiniStat label="Flight Time" value={flightSummary.duration} />
          </div>
          {chartTab === "elevation" ? (
            <ElevationChart hovered={hovered} onHover={setHoverKm} />
          ) : (
            <div className="relative mt-3 h-48 overflow-hidden rounded-xl bg-[#14331d]">
              <AerialScene mode="map" seed={15} className="h-full w-full" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d={routePath} fill="none" stroke="#93c5fd" strokeWidth="1.2" strokeDasharray="2 1.2" />
              </svg>
              <div className="absolute left-[22%] top-[58%] -translate-x-1/2 -translate-y-1/2">
                <UavMark className="h-5 w-5 text-sky-300" />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  note,
  icon,
  iconClass,
  deltaClass,
}: {
  label: string;
  value: string;
  delta?: string;
  note: string;
  icon: ReactNode;
  iconClass: string;
  deltaClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e6edf5] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", iconClass)}>{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-50">{value}</span>
          {delta && <span className={cn("text-xs font-semibold", deltaClass)}>{delta}</span>}
        </div>
        <div className="text-[11px] text-slate-400">{note}</div>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-[#e6edf5] bg-white px-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <Calendar className="h-4 w-4 text-slate-400" />
      <span>{formatRangeDate(value)}</span>
      <input
        aria-label={label}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

function CheckLabel({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-blue-600" />
      {label}
    </label>
  );
}

function MapButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center bg-white text-slate-600 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function LegendRow({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="grid w-4 place-items-center">{swatch}</span>
      <span>{label}</span>
    </div>
  );
}

function MapMarker({ target, active, onClick }: { target: LocatedTarget; active: boolean; onClick: () => void }) {
  const kind = pinKind(target.confidence);
  const place = target.map!;
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-full"
      style={{ left: `${place.x}%`, top: `${place.y}%` }}
      aria-label={`${target.id} ${target.confidence.toFixed(2)}`}
    >
      {kind === "low" ? (
        <span className={cn("block h-4 w-4 rounded-full bg-amber-300 ring-4 ring-amber-200/70", active && "ring-white")} />
      ) : (
        <span className="relative block">
          {place.label && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white drop-shadow">
              {place.label}
            </span>
          )}
          <svg viewBox="0 0 24 32" className={cn("h-7 w-5 drop-shadow", active && "scale-110")}>
            <path d="M12 0c6 0 10 4.4 10 10.2C22 18 12 32 12 32S2 18 2 10.2C2 4.4 6 0 12 0z" fill={kind === "high" ? "#ef4444" : "#f59e0b"} />
            <circle cx="12" cy="10" r="3.2" fill="white" />
          </svg>
        </span>
      )}
    </button>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-blue-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] text-slate-400">{label}</dt>
        <dd className="font-medium text-slate-700 dark:text-slate-100">{value}</dd>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f3f6fb] py-1.5 dark:border-slate-800">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function Pager({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 enabled:hover:bg-slate-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">{value}</div>
    </div>
  );
}

function ElevationChart({
  hovered,
  onHover,
}: {
  hovered: { km: number; altitude: number };
  onHover: (km: number) => void;
}) {
  const width = 320;
  const height = 180;
  const pad = { l: 32, r: 8, t: 16, b: 28 };
  const maxKm = 2.4;
  const maxAlt = 200;
  const x = (km: number) => pad.l + (km / maxKm) * (width - pad.l - pad.r);
  const y = (altitude: number) => pad.t + (1 - altitude / maxAlt) * (height - pad.t - pad.b);
  const line = flightProfile.map((point) => `${x(point.km)},${y(point.altitude)}`).join(" ");
  const hx = x(hovered.km);
  const hy = y(hovered.altitude);

  return (
    <div className="relative mt-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          const km = Math.min(maxKm, Math.max(0, ((ratio * width - pad.l) / (width - pad.l - pad.r)) * maxKm));
          onHover(Number(km.toFixed(2)));
        }}
      >
        {[0, 50, 100, 150, 200].map((tick) => (
          <g key={tick}>
            <line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.l - 6} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
              {tick}
            </text>
          </g>
        ))}
        {[0, 0.5, 1, 1.5, 2, 2.4].map((tick) => (
          <text key={tick} x={x(tick)} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {tick}
          </text>
        ))}
        <text x="14" y="12" fontSize="9" fill="#94a3b8" transform="rotate(-90 14 90)">
          Altitude (m)
        </text>
        <text x={width / 2} y={height - 1} textAnchor="middle" fontSize="9" fill="#94a3b8">
          Distance (km)
        </text>
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={line} />
        <circle cx={hx} cy={hy} r="4" fill="#1d4ed8" />
      </svg>
      <div
        className="pointer-events-none absolute rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow"
        style={{ left: `${(hx / width) * 100}%`, top: `${(hy / height) * 100}%`, transform: "translate(-50%, -140%)" }}
      >
        <div>{hovered.km.toFixed(1)} km</div>
        <div>{hovered.altitude} m</div>
      </div>
    </div>
  );
}
