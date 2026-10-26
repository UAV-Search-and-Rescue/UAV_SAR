import { useState, type ReactNode } from "react";
import { Brain, ClipboardList, Database, Folder, Save, Server, Settings } from "lucide-react";
import { useSystemSettings, type SystemSettings } from "../context/SystemSettings";
import { useUi } from "../context/UiContext";
import { imageSizes } from "../data/detection";

const modelChoices = [
  { id: "e0" as const, label: "YOLO E0 (RGB)" },
  { id: "e1" as const, label: "YOLO E1 (IR)" },
];

const services = [
  { title: "Backend API", status: "Unknown", detail: "No health endpoint configured", icon: Server },
  { title: "Database", status: "Unknown", detail: "No connection status available", icon: Database },
  { title: "Model Service", status: "Unknown", detail: "No runtime status available", icon: Brain },
  { title: "File Storage", status: "Unknown", detail: "No storage status available", icon: Folder },
];

export function SystemPage() {
  const { settings, saveSettings } = useSystemSettings();
  const { pushToast } = useUi();
  const [draft, setDraft] = useState<SystemSettings>(settings);
  const [saved, setSaved] = useState(false);

  function save() {
    saveSettings(draft);
    setSaved(true);
    pushToast("Configuration saved");
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-800 dark:text-slate-50">System</h1>
        <p className="text-sm text-slate-400">Configure the interface and inspect available system status.</p>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Server className="mt-0.5 h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Service Status</h2>
              <p className="text-xs text-slate-400">Service health is unavailable until a backend status endpoint is configured.</p>
            </div>
          </div>
          <span className="text-xs text-slate-400">Status: unknown</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.title} className="rounded-xl border border-[#e6edf5] px-4 py-3 dark:border-slate-800">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{service.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
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

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Activity</h2>
              <p className="text-xs text-slate-400">Activity requires a backend event feed.</p>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-[var(--color-background)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
          No system activity is available.
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
