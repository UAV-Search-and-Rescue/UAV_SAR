import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfBadge, EmptyState, Panel } from "../components/ui";
import { useUi } from "../context/UiContext";
import { API_BASE_URL, getDetectedFrames, type DetectedFrame } from "../lib/api";

type DateRange = "24h" | "7d" | "30d" | "all";
const PAGE_SIZE = 10;

const dateOptions: { id: DateRange; label: string }[] = [
  { id: "24h", label: "Last 24 hours" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

function downloadFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: DetectedFrame[]) {
  const header = ["Frame", "Timestamp", "Model", "Persons", "Top Confidence", "Inference ms", "Session ID"];
  const body = rows.map((row) =>
    [
      `#${row.frame_number}`,
      row.timestamp,
      row.model,
      row.person_count,
      `${Math.round(row.top_confidence * 100)}%`,
      row.inference_ms,
      row.session_id,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

export function ResultsPage() {
  const navigate = useNavigate();
  const { query, setQuery, pushToast } = useUi();
  const [frames, setFrames] = useState<DetectedFrame[]>([]);
  const [range, setRange] = useState<DateRange>("all");
  const [confidence, setConfidence] = useState(0);
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(true);

  const loadFrames = () => {
    getDetectedFrames().then(setFrames).catch(() => {});
  };

  useEffect(() => {
    loadFrames();
    const timer = window.setInterval(loadFrames, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const windowMs =
      range === "24h"
        ? 86_400_000
        : range === "7d"
        ? 7 * 86_400_000
        : range === "30d"
        ? 30 * 86_400_000
        : Number.POSITIVE_INFINITY;
    const needle = query.trim().toLowerCase();

    const rows = frames.filter((f) => {
      const ts = Date.parse(f.timestamp);
      if (!Number.isNaN(ts) && windowMs !== Number.POSITIVE_INFINITY && now - ts > windowMs) {
        return false;
      }
      if (confidence > 0 && f.top_confidence < confidence) return false;
      if (!needle) return true;
      return [
        `#${f.frame_number}`,
        `frame ${f.frame_number}`,
        f.model,
        f.session_id,
        `${Math.round(f.top_confidence * 100)}%`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    return [...rows].sort((a, b) =>
      sortDesc ? b.frame_number - a.frame_number : a.frame_number - b.frame_number,
    );
  }, [frames, range, confidence, query, sortDesc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function clearFilters() {
    setRange("all");
    setConfidence(0);
    setPage(1);
    setQuery("");
  }

  function exportCsv() {
    downloadFile("uav-sar-real-results.csv", toCsv(filtered), "text/csv");
    pushToast(`Exported ${filtered.length} real detection result(s)`);
  }

  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--sar-text-1)" }}>
            Results
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--sar-text-2)" }}>
            Real person detection results recorded from uploaded images and video streams
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadFrames}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold"
            style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--sar-teal)" }}
          >
            <Download className="h-4 w-4" /> Export Results
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <Panel className="grid gap-3 p-3 sm:grid-cols-3">
        <div>
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sar-text-3)" }}>
            <Calendar className="h-3.5 w-3.5" /> Date Range
          </span>
          <select
            aria-label="Date range"
            value={range}
            onChange={(e) => { setRange(e.target.value as DateRange); setPage(1); }}
            className="h-9 w-full rounded-lg px-2.5 text-xs outline-none"
            style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-1)" }}
          >
            {dateOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sar-text-3)" }}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Min Confidence
            </span>
            <span className="font-mono text-xs font-semibold" style={{ color: "var(--sar-teal)" }}>
              {confidence.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={confidence}
            onChange={(e) => { setConfidence(Number(e.target.value)); setPage(1); }}
            className="mt-1.5 w-full"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Clear Filters
          </button>
        </div>
      </Panel>

      {/* Full-width Real Detection Results Table (right block removed) */}
      <Panel className="overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--sar-border)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>
            Detection Results ({filtered.length})
          </span>
          <button
            type="button"
            onClick={() => setSortDesc((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: "var(--sar-text-3)" }}
          >
            Frame Order {sortDesc ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="p-8">
            <EmptyState message="No real detection results recorded yet. Run monitoring on the Dashboard to record detected frames." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--sar-surface-2)", borderBottom: "1px solid var(--sar-border)", color: "var(--sar-text-3)" }}>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Frame</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Thumbnail</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Model</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Persons</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Top Conf.</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const ts = new Date(row.timestamp);
                  const timeStr = Number.isNaN(ts.getTime()) ? row.timestamp : ts.toLocaleString();
                  return (
                    <tr
                      key={row.frame_id}
                      style={{ borderBottom: "1px solid var(--sar-border)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--sar-surface-2)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: "var(--sar-text-1)" }}>
                        #{row.frame_number}
                      </td>
                      <td className="px-4 py-2.5">
                        <img
                          src={`${API_BASE_URL}${row.rgb_frame_url}`}
                          alt={`Frame ${row.frame_number}`}
                          className="h-10 w-16 rounded bg-black object-cover"
                        />
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "var(--sar-text-2)" }}>{timeStr}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: "var(--sar-text-3)" }}>
                        {row.model}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: "var(--sar-text-1)" }}>
                        {row.person_count}
                      </td>
                      <td className="px-4 py-2.5">
                        <ConfBadge confidence={row.top_confidence} />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="badge-base badge-red">Person Found</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Inspect frame on Detection page"
                            onClick={() => navigate("/detection")}
                            className="rounded p-1.5 hover:opacity-80"
                            style={{ background: "var(--sar-surface-2)", color: "var(--sar-teal)" }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Download frame JSON"
                            onClick={() => downloadFile(`frame-${row.frame_number}.json`, JSON.stringify(row, null, 2), "application/json")}
                            className="rounded p-1.5 hover:opacity-80"
                            style={{ background: "var(--sar-surface-2)", color: "var(--sar-text-2)" }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 text-xs" style={{ borderTop: "1px solid var(--sar-border)", color: "var(--sar-text-3)" }}>
            <span>Page {safePage} of {pageCount}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="rounded px-2.5 py-1 disabled:opacity-40"
                style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
                className="rounded px-2.5 py-1 disabled:opacity-40"
                style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
