import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import { hudPanel } from "./hud";

export function ActiveAlerts() {
  return (
    <section className={cn(hudPanel, "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell aria-hidden="true" className="h-4 w-4 text-[var(--color-warning)]" />
          <h2 className="font-sans text-[15px] font-semibold text-[var(--color-text)]">Active alerts</h2>
        </div>
        <Link
          to="/alerts"
          className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-primary)] hover:underline"
        >
          View alerts
        </Link>
      </div>
      <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-4">
        <p className="font-sans text-xl font-semibold leading-none text-[var(--color-text)]">—</p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Unavailable</p>
      </div>
    </section>
  );
}
