import { useState, type ReactNode } from "react";
import { Brain, ClipboardList, Database, Folder, RefreshCw, Save, Server, Settings } from "lucide-react";
import { useSystemSettings, type SystemSettings } from "../context/SystemSettings";
import { useUi } from "../context/UiContext";
import { imageSizes } from "../data/detection";
import { cn } from "../lib/cn";

type LogLevel = "INFO" | "WARN";

type ActivityLog = {
  time: string;
  level: LogLevel;
  service: string;
  message: string;
};

const checkedAt = "16 Oct 2026, 03:24 PM";

const baseLogs: ActivityLog[] = [
  { time: "16 Oct 2026, 03:24 PM", level: "INFO", service: "api", message: "Health check successful" },
  { time: "16 Oct 2026, 03:23 PM", level: "INFO", service: "model", message: "Model loaded: YOLO E0" },
  { time: "16 Oct 2026, 03:22 PM", level: "INFO", service: "database", message: "Connected to MongoDB Atlas" },
  { time: "16 Oct 2026, 03:20 PM", level: "INFO", service: "detection", message: "Detection request completed (2 detections)" },
  { time: "16 Oct 2026, 03:18 PM", level: "WARN", service: "storage", message: "Disk usage above 70% (7.2 GB / 10 GB)" },
];

const olderLogs: ActivityLog[] = [
  { time: "16 Oct 2026, 03:10 PM", level: "INFO", service: "api", message: "Service status refreshed" },
  { time: "16 Oct 2026, 02:58 PM", level: "INFO", service: "detection", message: "Detection request completed (3 detections)" },
  { time: "16 Oct 2026, 02:41 PM", level: "INFO", service: "storage", message: "Storage check completed" },
  { time: "16 Oct 2026, 02:16 PM", level: "INFO", service: "model", message: "Model loaded: YOLO E0" },
  { time: "16 Oct 2026, 01:52 PM", level: "INFO", service: "database", message: "Connected to MongoDB Atlas" },
];

const modelChoices = [
  { id: "e0" as const, label: "YOLO E0 (RGB)" },
  { id: "e1" as const, label: "YOLO E1 (IR)" },
];

const services = [
  { title: "Backend API", status: "Online", detail: "FastAPI · v1.0.0", icon: Server },
  { title: "Database", status: "Connected", detail: "MongoDB Atlas", icon: Database },
  { title: "Model Service", status: "Ready", detail: "YOLO E0 (RGB)", icon: Brain },
  { title: "File Storage", status: "Available", detail: "1.8 GB / 10 GB", icon: Folder },
];

export function SystemPage() {
  const { settings, saveSettings } = useSystemSettings();
  const { pushToast } = useUi();
  const [draft, setDraft] = useState<SystemSettings>(settings);
  const [logs, setLogs] = useState(baseLogs);
  const [showAll, setShowAll] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saved, setSaved] = useState(false);

  const modelLabel = modelChoices.find((item) => item.id === settings.modelId)?.label ?? "YOLO E0 (RGB)";
  const visibleLogs = showAll ? [...logs, ...olderLogs] : logs;

  function refresh() {
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      setLogs((current) => {
        if (current[0]?.message === "Health check successful") return current;
        return [{ time: checkedAt, level: "INFO", service: "api", message: "Health check successful" }, ...current];
      });
    }, 500);
  }

  function save() {
    saveSettings(draft);
    setSaved(true);
    pushToast("Configuration saved");
    setLogs((current) => [
      { time: checkedAt, level: "INFO", service: "system", message: "Configuration saved" },
      ...current.filter((item) => item.message !== "Configuration saved"),
    ]);
    window.setTimeout(() => setSaved(false), 1600);
  }

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
              <p className="text-xs text-slate-400">Current status of all system components</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              aria-label="Refresh service status"
              onClick={refresh}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
            >
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} />
            </button>
            Last checked: {checkedAt}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;
            const detail = service.title === "Model Service" ? modelLabel : service.detail;
            return (
              <div key={service.title} className="rounded-xl border border-[#e6edf5] px-4 py-3 dark:border-slate-800">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-500">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{service.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {service.status}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{detail}</div>
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
        <div className="mt-4 overflow-x-auto">
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
