import { AlertTriangle, Server, Users } from "lucide-react";
import { Panel } from "../ui";

const metrics = [
  {
    label: "Persons detected",
    value: "—",
    detail: "Detection data unavailable",
    icon: Users,
  },
  {
    label: "Active alerts",
    value: "—",
    detail: "Alert data unavailable",
    icon: AlertTriangle,
  },
  {
    label: "System availability",
    value: "Unknown",
    detail: "No health endpoint configured",
    icon: Server,
  },
];

export function StatCards() {
  return (
    <section aria-label="Mission metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Panel key={metric.label} className="flex min-h-24 items-center gap-3 px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xs font-medium text-[var(--color-text-muted)]">{metric.label}</h2>
              <p className="mt-1 text-xl font-semibold leading-none text-[var(--color-text)]">{metric.value}</p>
              <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{metric.detail}</p>
            </div>
          </Panel>
        );
      })}
    </section>
  );
}
