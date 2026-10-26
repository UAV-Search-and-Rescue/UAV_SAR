import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MissionHeader() {
  const navigate = useNavigate();

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-1 pt-2">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Command</p>
        <h1 className="mt-1 font-sans text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-[28px]">
          Mission overview
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--color-text-muted)]">
          Dual-stream comparison and mission control status.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate("/tactical")}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[var(--color-primary)] bg-[var(--color-surface)] px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-primary)] transition hover:bg-[var(--color-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
      >
        <MapPin aria-hidden="true" className="h-4 w-4" />
        Tactical map
      </button>
    </header>
  );
}
