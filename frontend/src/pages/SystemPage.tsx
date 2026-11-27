import { useEffect, useState, type ReactNode } from "react";
import { Brain, ClipboardList, Database, Folder, RefreshCw, Save, Server, Settings } from "lucide-react";
import { useSystemSettings, type SystemSettings } from "../context/SystemSettings";
import { useUi } from "../context/UiContext";
import { imageSizes } from "../data/detection";
import { getHealth, type HealthResponse, API_BASE_URL } from "../lib/api";
import { cn } from "../lib/cn";

type LogLevel = "INFO" | "WARN";

type ActivityLog = {
  time: string;
  level: LogLevel;
  service: string;
  message: string;
};

const baseLogs: ActivityLog[] = [
  { time: "25 Oct 2026, 11:40 PM", level: "INFO", service: "api", message: "Health check successful" },
  { time: "25 Oct 2026, 11:38 PM", level: "INFO", service: "model", message: "Model registered: YOLO E0" },
  { time: "25 Oct 2026, 11:35 PM", level: "INFO", service: "detection", message: "Ready for inference requests" },
  { time: "25 Oct 2026, 11:30 PM", level: "INFO", service: "storage", message: "Local storage initialized" },
];

const olderLogs: ActivityLog[] = [
  { time: "25 Oct 2026, 11:20 PM", level: "INFO", service: "api", message: "Service status refreshed" },
  { time: "25 Oct 2026, 11:15 PM", level: "INFO", service: "detection", message: "RGB validation passed" },
  { time: "25 Oct 2026, 11:00 PM", level: "INFO", service: "system", message: "Frontend initialized" },
];

const modelChoices = [
  { id: "e0" as const, label: "YOLO E0 (RGB)" },
  { id: "e1" as const, label: "YOLO E1 (IR)" },
];

function formatTimeNow(): string {
  const d = new Date();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) + ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SystemPage() {
  const { settings, saveSettings } = useSystemSettings();
  const { pushToast } = useUi();
  const [draft, setDraft] = useState<SystemSettings>(settings);
  const [logs, setLogs] = useState(baseLogs);
  const [showAll, setShowAll] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("Checking...");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const modelLabel = modelChoices.find((item) => item.id === settings.modelId)?.label ?? "YOLO E0 (RGB)";
  const visibleLogs = showAll ? [...logs, ...olderLogs] : logs;

  async function checkHealthStatus() {
    setChecking(true);
    const start = performance.now();
    try {
      const res = await getHealth();
      const elapsed = Math.round(performance.now() - start);
      setHealth(res);
      setHealthError(null);
      setLatencyMs(elapsed);
      const timeStr = formatTimeNow();
      setLastChecked(timeStr);
      setLogs((current) => [
        {
          time: timeStr,
          level: res.status === "ok" ? "INFO" : "WARN",
          service: "api",
          message: `Health check: backend is ${res.status}, MongoDB is ${res.mongodb} (${elapsed}ms)`,
        },
        ...current.filter((item) => !item.message.startsWith("Health check")),
      ]);
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start);
      const msg = err instanceof Error ? err.message : "Connection failed";
      setHealth(null);
      setHealthError(msg);
      setLatencyMs(elapsed);
      const timeStr = formatTimeNow();
      setLastChecked(timeStr);
      setLogs((current) => [
        {
          time: timeStr,
          level: "WARN",
          service: "api",
          message: `Health check failed: ${msg} (${API_BASE_URL})`,
        },
        ...current.filter((item) => !item.message.startsWith("Health check")),
      ]);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkHealthStatus();
  }, []);

  function refresh() {
    checkHealthStatus();
  }

  function save() {
    saveSettings(draft);
    setSaved(true);
    pushToast("Configuration saved");
    const timeStr = formatTimeNow();
    setLogs((current) => [
      { time: timeStr, level: "INFO", service: "system", message: "Configuration saved" },
      ...current.filter((item) => item.message !== "Configuration saved"),
    ]);
    window.setTimeout(() => setSaved(false), 1600);
  }

  const services = [
    {
      title: "Backend API",
      status: health ? "Online" : healthError ? "Offline" : "Checking...",
      detail: health ? `${health.service} · FastAPI` : healthError ? `Unreachable (${API_BASE_URL})` : "Connecting to FastAPI...",
      isOnline: !!health,
      icon: Server,
    },
    {
      title: "Database",
      status: health?.mongodb === "connected" ? "Connected" : health ? "Disconnected" : "Unknown",
      detail: health?.mongodb === "connected" ? "MongoDB Atlas (Connected)" : "MongoDB (Disconnected/Local offline)",
      isOnline: health?.mongodb === "connected",
      icon: Database,
    },
    {
      title: "Model Service",
      status: "Ready",
      detail: `${modelLabel} (Stub ready)`,
      isOnline: true,
      icon: Brain,
    },
    {
      title: "File Storage",
      status: "Available",
      detail: "Local temporary storage",
      isOnline: true,
      icon: Folder,
    },
  ];

  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-800 dark:text-slate-50">System</h1>
        <p className="text-sm text-slate-400">Manage system status and configuration</p>
      </div>

      <section className="rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Server className="mt-0.5 h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Service Status</h2>
              <p className="text-xs text-slate-400">
                Live backend health from {API_BASE_URL}
                {latencyMs !== null && ` (${latencyMs} ms)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              aria-label="Refresh service status"
              onClick={refresh}
              disabled={checking}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} />
            </button>
            Last checked: {lastChecked}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.title} className="rounded-xl border border-[#e6edf5] px-4 py-3 dark:border-slate-800">
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg",
                    service.isOnline ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40" : "bg-amber-50 text-amber-500 dark:bg-amber-950/40",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{service.title}</div>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1.5 text-xs font-medium",
                    service.isOnline ? "text-emerald-500" : "text-amber-500",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      service.isOnline ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  {service.status}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{service.detail}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Settings className="mt-0.5 h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Configuration</h2>
              <p className="text-xs text-slate-400">Manage important system settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved" : "Save Changes"}
          </button>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="confidence" className="text-sm text-slate-600 dark:text-slate-300">
                Default Confidence Threshold
              </label>
              <span className="rounded-lg border border-[#e6edf5] px-2 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-100">
                {draft.threshold.toFixed(2)}
              </span>
            </div>
            <input
              id="confidence"
              type="range"
              min={0.1}
              max={0.9}
              step={0.01}
              value={draft.threshold}
              onChange={(event) => setDraft((current) => ({ ...current, threshold: Number(event.target.value) }))}
              className="mt-3 w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>0.1</span>
              <span>0.9</span>
            </div>
          </div>

          <Field label="Default Model">
            <select
              aria-label="Default Model"
              value={draft.modelId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, modelId: event.target.value as SystemSettings["modelId"] }))
              }
              className="h-10 w-full rounded-lg border border-[#e6edf5] bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {modelChoices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Max Image Size">
            <select
              aria-label="Max Image Size"
              value={draft.imageSize}
              onChange={(event) => setDraft((current) => ({ ...current, imageSize: event.target.value }))}
              className="h-10 w-full rounded-lg border border-[#e6edf5] bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {imageSizes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Environment">
            <select
              aria-label="Environment"
              value={draft.environment}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  environment: event.target.value as SystemSettings["environment"],
                }))
              }
              className="h-10 w-full rounded-lg border border-[#e6edf5] bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option>Development</option>
              <option>Staging</option>
              <option>Production</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e6edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Activity</h2>
              <p className="text-xs text-slate-400">Latest system events and logs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#e6edf5] px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            {showAll ? "Show less" : "View All Logs"}
            {!showAll && <span aria-hidden="true">→</span>}
          </button>
        </div>
        {/* Mobile Activity Cards (< sm) */}
        <div className="mt-4 space-y-2 sm:hidden">
          {visibleLogs.map((log) => (
            <div
              key={`${log.time}-${log.message}`}
              className="rounded-xl border border-slate-100 bg-[#f8fafc] p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    log.level === "WARN" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" : "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400",
                  )}
                >
                  {log.level} · {log.service}
                </span>
                <span className="text-[11px] text-slate-400">{log.time}</span>
              </div>
              <div className="mt-1.5 text-xs text-slate-700 dark:text-slate-200">{log.message}</div>
            </div>
          ))}
        </div>

        {/* Desktop Activity Table (>= sm) */}
        <div className="mt-4 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr className="border-y border-[#eef3f8] dark:border-slate-800">
                {["Time", "Level", "Service", "Message"].map((heading) => (
                  <th key={heading} className="px-3 py-2 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => (
                <tr key={`${log.time}-${log.message}`} className="border-b border-[#f3f6fb] dark:border-slate-800">
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{log.time}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        log.level === "WARN" ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600",
                      )}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{log.service}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-200">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
