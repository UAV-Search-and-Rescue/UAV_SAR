import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  Image as ImageIcon,
  RefreshCw,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AerialScene } from "../components/dashboard/AerialScene";
import { MissingRecord, Panel } from "../components/ui";
import { useUi } from "../context/UiContext";
import { confidenceTone, formatConfidence, type DetectedObject } from "../data/detection";
import { matchesQuery } from "../data/mission";
import {
  MISSION_NOW,
  PAGE_SIZE,
  missionResults,
  resultById,
  type MissionResult,
  type ResultModel,
  type ResultStatus,
} from "../data/results";
import { cn } from "../lib/cn";
import { UavMark } from "../components/icons";

type DateRange = "24h" | "7d" | "30d" | "all";
type ModelFilter = "all" | ResultModel;
type StatusFilter = "all" | ResultStatus;

const dateOptions: { id: DateRange; label: string }[] = [
  { id: "24h", label: "Last 24 hours" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

function withinRange(at: number, range: DateRange) {
  if (range === "all") return true;
  const windowMs = range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
  return MISSION_NOW - at <= windowMs && at <= MISSION_NOW;
}

function downloadFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: MissionResult[]) {
  const header = ["ID", "Date", "Time", "Model", "Detections", "Status", "Input", "Inference ms", "Location"];
  const body = rows.map((row) =>
    [row.id, row.date, row.time, row.model, row.count, row.status, row.input, row.inferenceMs, row.location]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

function pageItems(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, "…", total] as const;
  if (current >= total - 2) return [1, "…", total - 2, total - 1, total] as const;
  return [1, "…", current, "…", total] as const;
}

export function ResultsPage() {
  const { resultId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { query, setQuery, pushToast } = useUi();
  const [range, setRange] = useState<DateRange>("7d");
  const [model, setModel] = useState<ModelFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [confidence, setConfidence] = useState(0);
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(true);
  const [checked, setChecked] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [focusId, setFocusId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const rows = missionResults.filter((result) => {
      if (!withinRange(result.at, range)) return false;
      if (model !== "all" && result.model !== model) return false;
      if (status !== "all" && result.status !== status) return false;
      if (confidence > 0 && !result.objects.some((object) => object.confidence >= confidence)) return false;
      return matchesQuery(query, [
        `#${result.id}`,
        result.id,
        result.date,
        result.time,
        result.model,
        result.status,
        result.location,
        result.place,
        result.input,
      ]);
    });
    return [...rows].sort((a, b) => (sortDesc ? b.at - a.at : a.at - b.at));
  }, [confidence, model, query, range, sortDesc, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = resultById(resultId) ?? (resultId ? undefined : missionResults[0]);
  const score = params.get("score");
  const scoreFocus =
    selected?.objects.find((object) => formatConfidence(object.confidence) === score)?.id ??
    selected?.thermal.find((object) => formatConfidence(object.confidence) === score)?.id ??
    null;
  const activeFocus = focusId ?? scoreFocus;
  const pageIds = visible.map((result) => result.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => checked.includes(id));

  useEffect(() => {
    setJsonOpen(false);
    setFocusId(null);
    setDetailsOpen(true);
  }, [resultId]);

  function clearFilters() {
    setRange("7d");
    setModel("all");
    setStatus("all");
    setConfidence(0);
    setPage(1);
    setQuery("");
  }

  function openResult(id: string) {
    setDetailsOpen(true);
    const index = filtered.findIndex((result) => result.id === id);
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1);
    navigate(`/results/${id}`);
  }

  function togglePage(on: boolean) {
    setChecked((current) =>
      on ? [...new Set([...current, ...pageIds])] : current.filter((id) => !pageIds.includes(id)),
    );
  }

  function exportRows(rows: MissionResult[]) {
    downloadFile("uav-sar-results.csv", toCsv(rows), "text/csv");
    pushToast(`Exported ${rows.length} result${rows.length === 1 ? "" : "s"}`);
  }

  return (
    <div className="px-4 pb-6 sm:px-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Results</h1>
          <p className="mt-1 text-sm text-slate-400">View and manage all detection results from your missions</p>
        </div>
        <button
          type="button"
          onClick={() => exportRows(checked.length ? filtered.filter((row) => checked.includes(row.id)) : filtered)}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Export Results
        </button>
      </div>

      <Panel className="mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <FilterSelect
            icon={<Calendar className="h-4 w-4" />}
            label="Date Range"
            value={range}
            onChange={(value) => {
              setRange(value as DateRange);
              setPage(1);
            }}
            options={dateOptions}
          />
          <FilterSelect
            icon={<SlidersHorizontal className="h-4 w-4" />}
            label="Model"
            value={model}
            onChange={(value) => {
              setModel(value as ModelFilter);
              setPage(1);
            }}
            options={[
              { id: "all", label: "All Models" },
              { id: "YOLO E0", label: "YOLO E0" },
              { id: "YOLO E1", label: "YOLO E1" },
            ]}
          />
          <FilterSelect
            icon={<ImageIcon className="h-4 w-4" />}
            label="Status"
            value={status}
            onChange={(value) => {
              setStatus(value as StatusFilter);
              setPage(1);
            }}
            options={[
              { id: "all", label: "All Results" },
              { id: "Person Found", label: "Person Found" },
              { id: "No Detections", label: "No Detections" },
            ]}
          />
          </div>
          <label className="block xl:w-56">
            <span className="text-xs font-medium text-slate-500">Confidence</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={confidence}
              aria-label="Minimum confidence"
              onChange={(event) => {
                setConfidence(Number(event.target.value));
                setPage(1);
              }}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
            />
            <span className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>0.0</span>
              <span>1.0</span>
            </span>
          </label>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Filters
          </button>
        </div>
      </Panel>

      <div className={cn("grid items-start gap-4", detailsOpen && "lg:grid-cols-12")}>
        <Panel className={cn(detailsOpen ? "lg:col-span-7" : "lg:col-span-12")}>
          <div className="flex items-center gap-2 px-4 py-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <ImageIcon className="h-4 w-4" />
            </span>
            <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              Detection Results ({filtered.length})
            </h2>
          </div>
          {visible.length === 0 ? (
            <div className="px-4 pb-6 text-sm text-slate-400">
              No results match these filters.
              <button type="button" onClick={clearFilters} className="ml-2 font-medium text-blue-600">
                Reset filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="px-4 pb-2 font-medium">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(event) => togglePage(event.target.checked)}
                        aria-label="Select results on this page"
                      />
                    </th>
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">Thumbnail</th>
                    <th className="pb-2 font-medium">
                      <button
                        type="button"
                        onClick={() => setSortDesc((value) => !value)}
                        className="inline-flex items-center gap-1 font-medium"
                      >
                        Date & Time
                        {sortDesc ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                      </button>
                    </th>
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 font-medium">Detections</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 pr-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((result) => {
                    const active = selected?.id === result.id && detailsOpen;
                    return (
                      <tr
                        key={result.id}
                        onClick={() => openResult(result.id)}
                        className={cn(
                          "cursor-pointer border-t border-slate-100 dark:border-slate-800",
                          active ? "bg-blue-50/80 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        )}
                      >
                        <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked.includes(result.id)}
                            aria-label={`Select ${result.id}`}
                            onChange={(event) =>
                              setChecked((current) =>
                                event.target.checked
                                  ? [...current, result.id]
                                  : current.filter((id) => id !== result.id),
                              )
                            }
                          />
                        </td>
                        <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-100">#{result.id}</td>
                        <td className="py-2.5">
                          <Thumb seed={result.seed} />
                        </td>
                        <td className="py-2.5 text-xs leading-4 text-slate-500">
                          <div>{result.date}</div>
                          <div>{result.time}</div>
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{result.model}</td>
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{result.count}</td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              result.status === "Person Found"
                                ? "bg-rose-100 text-rose-500"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {result.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4" onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <IconButton label={`View ${result.id}`} onClick={() => openResult(result.id)}>
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              label={`Download ${result.id}`}
                              onClick={() =>
                                downloadFile(
                                  `${result.id}.json`,
                                  JSON.stringify(resultPayload(result), null, 2),
                                  "application/json",
                                )
                              }
                            >
                              <Download className="h-4 w-4" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {pageItems(safePage, pageCount).map((item, index) =>
                item === "…" ? (
                  <span key={`gap-${index}`} className="px-1 text-sm text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg text-sm",
                      item === safePage ? "bg-blue-600 font-semibold text-white" : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              disabled={safePage === pageCount}
              onClick={() => setPage(safePage + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              Next
            </button>
          </div>
        </Panel>

        {detailsOpen && (
          <Panel className="lg:col-span-5">
            {selected ? (
              <ResultDetails
                result={selected}
                jsonOpen={jsonOpen}
                focusId={activeFocus}
                onClose={() => setDetailsOpen(false)}
                onToggleJson={() => setJsonOpen((open) => !open)}
                onFocus={setFocusId}
              />
            ) : (
              <MissingRecord kind="result" id={resultId ?? ""} onBack={() => navigate("/results")} />
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function resultPayload(result: MissionResult) {
  return {
    id: result.id,
    date: result.date,
    time: result.time,
    model: result.model,
    status: result.status,
    input: result.input,
    inference_time_ms: result.inferenceMs,
    location: result.location,
    detections: result.objects.map((object) => ({
      class: object.className,
      confidence: object.confidence,
      bbox_xyxy: object.box,
    })),
  };
}

function FilterSelect({
  icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="relative mt-1 block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

function Thumb({ seed }: { seed: number }) {
  return (
    <div className="h-10 w-10 overflow-hidden rounded-md bg-slate-800">
      <AerialScene mode="thumb" seed={seed} people={[{ x: 50, y: 48 }]} className="h-full w-full" />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50"
    >
      {children}
    </button>
  );
}

function ResultDetails({
  result,
  jsonOpen,
  focusId,
  onClose,
  onToggleJson,
  onFocus,
}: {
  result: MissionResult;
  jsonOpen: boolean;
  focusId: number | null;
  onClose: () => void;
  onToggleJson: () => void;
  onFocus: (id: number) => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">#{result.id}</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                result.status === "Person Found" ? "bg-rose-100 text-rose-500" : "bg-slate-100 text-slate-500",
              )}
            >
              {result.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">
            {result.date}, {result.time}
          </div>
          <button
            type="button"
            aria-label="Close result details"
            onClick={onClose}
            className="ml-auto mt-1 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
        <Meta icon={<UavMark className="h-4 w-4 text-blue-500" />} title={result.model} caption="Model" />
        <Meta icon={<Clock className="h-4 w-4 text-slate-400" />} title={`${result.inferenceMs} ms`} caption="Inference Time" />
        <Meta icon={<ImageIcon className="h-4 w-4 text-slate-400" />} title={result.input} caption="Input Type" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Frame
          title={`RGB Image (${result.input === "Thermal" ? 0 : result.objects.length} detections)`}
          mode="rgb"
          empty={result.input === "Thermal"}
          objects={result.input === "Thermal" ? [] : result.objects}
          focusId={focusId}
          seed={result.seed}
        />
        <Frame
          title={`Thermal Image (${result.thermal.length} detections)`}
          mode="thermal"
          empty={result.input === "RGB"}
          objects={result.thermal}
          focusId={focusId}
          seed={result.seed + 3}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Users className="h-4 w-4 text-blue-600" />
          Detected Objects ({result.objects.length})
        </div>
        <button type="button" onClick={onToggleJson} className="text-xs font-semibold text-blue-600 hover:underline">
          {"{ }"} View JSON
        </button>
      </div>
      {jsonOpen && (
        <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
          {JSON.stringify(resultPayload(result), null, 2)}
        </pre>
      )}
      {result.objects.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">This run did not mark a person.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
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
              {result.objects.map((object, index) => (
                <tr key={object.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 text-slate-400">{index + 1}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{object.className}</td>
                  <td className="py-2">
                    <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", confidenceTone(object.confidence))}>
                      {formatConfidence(object.confidence)}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-[11px] text-slate-500">({object.box.join(", ")})</td>
                  <td className="py-2">
                    <Thumb seed={object.seed} />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onFocus(object.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
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

function Meta({ icon, title, caption }: { icon: ReactNode; title: string; caption: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-950">
      {icon}
      <div>
        <div className="font-semibold text-slate-700 dark:text-slate-100">{title}</div>
        <div>{caption}</div>
      </div>
    </div>
  );
}

function Frame({
  title,
  mode,
  empty,
  objects,
  focusId,
  seed,
}: {
  title: string;
  mode: "rgb" | "thermal";
  empty: boolean;
  objects: DetectedObject[];
  focusId: number | null;
  seed: number;
}) {
  const people = objects.map((object) => ({
    x: object.frame.x + object.frame.w / 2,
    y: object.frame.y + object.frame.h / 2,
  }));
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-slate-500">{title}</div>
      <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-800">
        {empty ? (
          <div className="grid h-full place-items-center text-xs text-slate-300">No {mode} input</div>
        ) : (
          <AerialScene mode={mode} people={people} seed={seed} className="h-full w-full" />
        )}
        {!empty &&
          objects.map((object) => (
            <div
              key={object.id}
              className={cn("absolute border-2 border-red-500", focusId === object.id && "ring-2 ring-blue-500")}
              style={{
                left: `${object.frame.x}%`,
                top: `${object.frame.y}%`,
                width: `${object.frame.w}%`,
                height: `${object.frame.h}%`,
              }}
            >
              <span className="absolute -top-5 left-0 whitespace-nowrap bg-red-500 px-1 py-0.5 text-[10px] font-semibold text-white">
                person {formatConfidence(object.confidence)}
              </span>
            </div>
          ))}
        {!empty && (
          <span className="absolute bottom-1.5 left-2 text-[11px] font-semibold text-white drop-shadow">
            {mode === "rgb" ? "RGB" : "Thermal"}
          </span>
        )}
      </div>
    </div>
  );
}
