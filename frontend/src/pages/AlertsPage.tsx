import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageIcon,
  Info,
  MapPin,
  Mountain,
} from "lucide-react";
import { AerialScene } from "../components/dashboard/AerialScene";
import { MissingRecord } from "../components/ui";
import { UavMark } from "../components/icons";
import { useUi } from "../context/UiContext";
import {
  alertById,
  sarAlerts,
  type AlertPriority,
  type AlertState,
  type SarAlert,
} from "../data/alerts";
import { cn } from "../lib/cn";

const PAGE_SIZE = 6;

const windows = [
  { id: "24h", label: "Last 24 Hours", minutes: 60 * 24 },
  { id: "7d", label: "Last 7 Days", minutes: 60 * 24 * 7 },
  { id: "all", label: "All time", minutes: Number.POSITIVE_INFINITY },
];

const priorityTone: Record<AlertPriority, { badge: string; dot: string; pill: string }> = {
  High: {
    badge: "bg-rose-100 text-rose-500",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-500",
  },
  Medium: {
    badge: "bg-amber-100 text-amber-600",
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-600",
  },
  Low: {
    badge: "bg-sky-100 text-sky-600",
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-600",
  },
};

function StatCard({
  label,
  value,
  delta,
  deltaClass,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  delta?: string;
  deltaClass?: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e6edf5] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", iconClass)}>{icon}</span>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-50">{value}</span>
          {delta && <span className={cn("text-xs font-semibold", deltaClass)}>{delta}</span>}
        </div>
      </div>
    </div>
  );
}

function pageList(count: number, page: number) {
  if (count <= 5) return Array.from({ length: count }, (_, index) => index + 1);
  const pages = new Set([1, count, page, page - 1, page + 1]);
  return [...pages].filter((item) => item >= 1 && item <= count).sort((a, b) => a - b);
}

export function AlertsPage() {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const { query, pushToast, setQuery } = useUi();
  const [windowId, setWindowId] = useState("24h");
  const [priority, setPriority] = useState<"All" | AlertPriority>("All");
  const [page, setPage] = useState(1);
  const [states, setStates] = useState<Record<string, AlertState>>(() =>
    Object.fromEntries(sarAlerts.map((alert) => [alert.id, alert.state])),
  );

  const selected = alertId ? alertById(alertId) : sarAlerts[0];
  const selectedState = selected ? (states[selected.id] ?? selected.state) : "open";
  const windowMinutes = windows.find((item) => item.id === windowId)?.minutes ?? 60 * 24;

  useEffect(() => {
    if (!alertId) return;
    const index = sarAlerts.findIndex((alert) => alert.id === alertId);
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1);
  }, [alertId]);

  const inWindow = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sarAlerts.filter((alert) => {
      if (alert.minutesAgo > windowMinutes) return false;
      if (!needle) return true;
      return [alert.headline, alert.summary, alert.detail, alert.latitude, alert.longitude, alert.priority, alert.listTitle]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, windowMinutes]);

  const counts = {
    All: inWindow.length,
    High: inWindow.filter((alert) => alert.priority === "High").length,
    Medium: inWindow.filter((alert) => alert.priority === "Medium").length,
    Low: inWindow.filter((alert) => alert.priority === "Low").length,
  };

  const filtered = priority === "All" ? inWindow : inWindow.filter((alert) => alert.priority === priority);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pages = pageList(pageCount, safePage);

  const total = inWindow.length;
  const high = counts.High;
  const acknowledged = inWindow.filter((alert) => states[alert.id] === "acknowledged").length;
  const resolved = inWindow.filter((alert) => states[alert.id] === "resolved").length;

  function choosePriority(next: "All" | AlertPriority) {
    setPriority(next);
    setPage(1);
  }

  function openAlert(alert: SarAlert) {
    navigate(`/alerts/${alert.id}`);
  }

  function setState(id: string, state: AlertState) {
    setStates((current) => ({ ...current, [id]: state }));
    pushToast(state === "acknowledged" ? "Alert acknowledged" : "Alert marked resolved");
  }

  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-800 dark:text-slate-50">Alerts</h1>
          <p className="text-sm text-slate-400">Monitor and manage important alerts from detection system</p>
        </div>
        <label className="relative">
          <select
            aria-label="Time range"
            value={windowId}
            onChange={(event) => {
              setWindowId(event.target.value);
              setPage(1);
            }}
            className="h-10 appearance-none rounded-xl border border-[#e6edf5] bg-white pl-3 pr-8 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {windows.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-2 top-3 h-4 w-4 rotate-90 text-slate-400" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Alerts"
          value={total}
          delta="↑ +2"
          deltaClass="text-rose-500"
          icon={<Bell className="h-5 w-5" />}
          iconClass="bg-rose-50 text-rose-500"
        />
        <StatCard
          label="High Priority"
          value={high}
          delta="↑ +1"
          deltaClass="text-orange-500"
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClass="bg-orange-50 text-orange-500"
        />
        <StatCard
          label="Acknowledged"
          value={acknowledged}
          delta="↑ +1"
          deltaClass="text-blue-500"
          icon={<Info className="h-5 w-5" />}
          iconClass="bg-blue-50 text-blue-500"
        />
        <StatCard
          label="Resolved"
          value={resolved}
          icon={<Check className="h-5 w-5" />}
          iconClass="bg-emerald-50 text-emerald-500"
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <section className="rounded-2xl border border-[#e6edf5] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div className="flex items-center gap-1 overflow-x-auto px-1 py-1">
            {(["All", "High", "Medium", "Low"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => choosePriority(item)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                  priority === item
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
              >
                {item} ({counts[item]})
              </button>
            ))}
          </div>

          <div className="mt-2 space-y-1">
            {visible.map((alert) => {
              const active = alert.id === selected?.id;
              const tone = priorityTone[alert.priority];
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => openAlert(alert)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-l-[3px] px-2 py-2.5 text-left",
                    active
                      ? "border-blue-500 bg-[#eef5ff]"
                      : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800",
                  )}
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                    <AerialScene mode="thumb" seed={alert.seed} people={[{ x: 52, y: 48 }]} className="h-full w-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {alert.listTitle}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate pl-4 text-xs text-slate-400">{alert.headline}</span>
                    <span className="mt-0.5 block pl-4 text-[11px] text-slate-300">{alert.ago}</span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", tone.badge)}>
                    {alert.priority}
                  </span>
                </button>
              );
            })}
            {visible.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-slate-400">
                No alerts in this view.
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPriority("All");
                    setPage(1);
                  }}
                  className="ml-2 font-medium text-blue-600"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-center gap-1 border-t border-[#eef3f8] py-3 dark:border-slate-800">
            <button
              type="button"
              aria-label="Previous page"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 enabled:hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pages.map((item, index) => {
              const gap = index > 0 && item - pages[index - 1] > 1;
              return (
                <span key={item} className="flex items-center">
                  {gap && <span className="px-1 text-slate-300">…</span>}
                  <button
                    type="button"
                    onClick={() => setPage(item)}
                    className={cn(
                      "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm",
                      item === safePage ? "bg-blue-600 font-semibold text-white" : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    {item}
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              aria-label="Next page"
              disabled={safePage === pageCount}
              onClick={() => setPage(safePage + 1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 enabled:hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          {!selected ? (
            <MissingRecord kind="alert" id={alertId ?? ""} onBack={() => navigate("/alerts")} />
          ) : (
          <>
          <div className="flex items-center justify-between gap-3">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", priorityTone[selected.priority].pill)}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {selected.priority} Priority
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {selected.ago}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-800 dark:text-slate-50">{selected.headline}</h2>
          <p className="mt-1 text-sm text-slate-400">{selected.summary}</p>

          <div className="mt-4 grid gap-4 rounded-2xl bg-[#f7f9fc] p-3 dark:bg-slate-800/60 md:grid-cols-[minmax(0,1fr)_168px]">
            <div className="relative overflow-hidden rounded-xl bg-slate-900">
              <AerialScene
                mode="rgb"
                seed={selected.seed}
                people={[{ x: selected.frame.x + selected.frame.w / 2, y: selected.frame.y + selected.frame.h / 2 }]}
                className="aspect-[16/10] w-full"
              />
              <span
                className="absolute border-2 border-red-500"
                style={{
                  left: `${selected.frame.x + selected.frame.w / 2 - 7}%`,
                  top: `${selected.frame.y + selected.frame.h / 2 - 14}%`,
                  width: "14%",
                  height: "34%",
                }}
              >
                <span className="absolute -top-5 left-0 whitespace-nowrap rounded-sm bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  person {selected.confidence.toFixed(2)}
                </span>
              </span>
            </div>
            <dl className="space-y-4 py-1 text-sm">
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div>
                  <dt className="text-slate-400">Latitude</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-100">{selected.latitude}</dd>
                </div>
              </div>
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div>
                  <dt className="text-slate-400">Longitude</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-100">{selected.longitude}</dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Mountain className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div>
                  <dt className="text-slate-400">Altitude</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-100">{selected.altitude}</dd>
                </div>
              </div>
              <div className="flex gap-2">
                <UavMark className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div>
                  <dt className="text-slate-400">Model</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-100">{selected.model}</dd>
                </div>
              </div>
            </dl>
          </div>

          <h3 className="mt-5 text-sm font-semibold text-slate-800 dark:text-slate-100">Alert Details</h3>
          <p className="mt-1 text-sm text-slate-400">{selected.detail}</p>
          {selectedState !== "open" && (
            <p className="mt-2 text-xs font-medium text-slate-500">
              Status: {selectedState === "acknowledged" ? "Acknowledged" : "Resolved"}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={selectedState !== "open"}
              onClick={() => setState(selected.id, "acknowledged")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-200 disabled:text-blue-700"
            >
              <Check className="h-4 w-4" />
              {selectedState === "open" ? "Acknowledge" : "Acknowledged"}
            </button>
            <button
              type="button"
              disabled={selectedState === "resolved"}
              onClick={() => setState(selected.id, "resolved")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e6edf5] bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ImageIcon className="h-4 w-4" />
              {selectedState === "resolved" ? "Resolved" : "Mark as Resolved"}
            </button>
          </div>
          </>
          )}
        </section>
      </div>
    </div>
  );
}
