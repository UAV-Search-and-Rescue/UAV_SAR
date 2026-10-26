import { AlertTriangle, Server, Users } from "lucide-react";
import { cn } from "../../lib/cn";
import { hudPanel } from "./hud";

const metrics = [
  { label: "Persons detected", value: "—", detail: "Unavailable", icon: Users },
  { label: "Active alerts", value: "—", detail: "Unavailable", icon: AlertTriangle },
  { label: "System availability", value: "—", detail: "Unavailable", icon: Server },
];

export function StatCards() {
  return (
    <section aria-label="Mission metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article key={metric.label} className={cn(hudPanel, "flex min-h-24 items-center gap-3 px-4 py-3")}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-background)] text-[var(--color-primary)]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {metric.label}
              </h2>
              <p className="mt-1 font-sans text-xl font-semibold leading-none text-[var(--color-text)]">{metric.value}</p>
              <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{metric.detail}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
