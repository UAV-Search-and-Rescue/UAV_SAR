import { FormEvent, useMemo, useState } from "react";
import { Crosshair, Grid3x3 } from "lucide-react";
import { formatDegrees, locatedTargets } from "../data/locations";
import {
  GRID_COLS,
  GRID_ROWS,
  cellFromPercent,
  focusTransform,
  formatGrid,
  heatColor,
  parseGridReference,
  type GridCell,
} from "../lib/tacticalGrid";
import { cn } from "../lib/cn";
import { AerialScene } from "../components/dashboard/AerialScene";

const cells = Array.from({ length: GRID_ROWS * GRID_COLS }, (_, index) => ({
  row: Math.floor(index / GRID_COLS) + 1,
  col: (index % GRID_COLS) + 1,
}));

export function TacticalMapPage() {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [focus, setFocus] = useState<GridCell | null>(null);
  const [showHeat, setShowHeat] = useState(true);

  const plotted = useMemo(() => locatedTargets.filter((target) => target.map), []);

  const { heat, counts, maxHeat } = useMemo(() => {
    const density = Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => 0));
    const hits = Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => 0));
    for (const target of plotted) {
      const cell = cellFromPercent(target.map!.x, target.map!.y);
      hits[cell.row - 1][cell.col - 1] += 1;
      for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
        for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
          const row = cell.row - 1 + rowOffset;
          const col = cell.col - 1 + colOffset;
          if (row < 0 || col < 0 || row >= GRID_ROWS || col >= GRID_COLS) continue;
          const weight = Math.max(0, 1 - Math.hypot(rowOffset, colOffset) / 2.6);
          density[row][col] += weight;
        }
      }
    }
    const peak = density.reduce((best, row) => Math.max(best, ...row), 0);
    return { heat: density, counts: hits, maxHeat: peak };
  }, [plotted]);

  const focusCode = focus ? formatGrid(focus.row, focus.col) : "";
  const sectorTargets = focus
    ? plotted.filter((target) => {
        const cell = cellFromPercent(target.map!.x, target.map!.y);
        return cell.row === focus.row && cell.col === focus.col;
      })
    : [];
  const occupied = cells.filter((cell) => counts[cell.row - 1][cell.col - 1] > 0);

  function applyReference(raw: string) {
    const cell = parseGridReference(raw);
    if (!cell) {
      setError("Enter a sector such as R14C03. Rows and columns run from 01 to 20.");
      return;
    }
    setError("");
    setDraft(formatGrid(cell.row, cell.col));
    setFocus(cell);
  }

  function onDraftChange(value: string) {
    const next = value.toUpperCase();
    setDraft(next);
    const cell = parseGridReference(next);
    if (cell) {
      setError("");
      setFocus(cell);
      return;
    }
    if (next.length >= 6) {
      setError("Enter a sector such as R14C03. Rows and columns run from 01 to 20.");
      return;
    }
    setError("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    applyReference(draft);
  }

  function resetView() {
    setFocus(null);
    setDraft("");
    setError("");
  }

  return (
    <div className="space-y-4 px-4 pb-8 pt-4 font-sans text-[var(--color-text)] sm:px-5 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Navigation</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">Tactical map</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
            Enter a grid reference to center the search grid. Heat shows where plotted targets cluster.
          </p>
        </div>
        <p role="status" className="font-mono text-sm tracking-wide text-[var(--color-primary)]">
          {focusCode ? `Focused ${focusCode}` : "Full grid"}
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="mb-1.5 block font-medium">Grid reference</span>
          <input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="R14C03"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "grid-reference-error" : "grid-reference-hint"}
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
            className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono uppercase tracking-[0.14em] text-[var(--color-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 text-sm font-semibold text-[var(--color-surface)]"
        >
          <Crosshair aria-hidden="true" className="h-4 w-4" />
          Focus sector
        </button>
        <label className="min-w-[12rem] text-sm">
          <span className="mb-1.5 block font-medium">Occupied sectors</span>
          <select
            aria-label="Occupied sectors"
            value={occupied.some((cell) => formatGrid(cell.row, cell.col) === focusCode) ? focusCode : ""}
            onChange={(event) => {
              if (event.target.value) applyReference(event.target.value);
            }}
            className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-[var(--color-text)]"
          >
            <option value="">Select a sector</option>
            {occupied.map((cell) => {
              const code = formatGrid(cell.row, cell.col);
              const count = counts[cell.row - 1][cell.col - 1];
              return (
                <option key={code} value={code}>
                  {code} · {count} {count === 1 ? "target" : "targets"}
                </option>
              );
            })}
          </select>
        </label>
        <label className="inline-flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showHeat}
            onChange={(event) => setShowHeat(event.target.checked)}
            className="accent-[var(--color-primary)]"
          />
          Heatmap
        </label>
        <button
          type="button"
          onClick={resetView}
          className="inline-flex h-10 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium"
        >
          Full grid
        </button>
      </form>
      <p id="grid-reference-hint" className="text-xs text-[var(--color-text-muted)]">
        Format is row then column, from R01C01 through R20C20.
      </p>
      {error && (
        <p id="grid-reference-error" role="alert" className="text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] lg:col-span-8">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <Grid3x3 aria-hidden="true" className="h-4 w-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-semibold">Search grid</h2>
          </div>
          <div className="relative h-[min(72vh,760px)] overflow-hidden bg-[var(--color-background)]">
            <div
              className="absolute inset-0"
              style={{ transform: focusTransform(focus), transformOrigin: "0 0" }}
            >
              <AerialScene mode="map" seed={15} className="h-full w-full" />
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
                }}
              >
                {cells.map((cell) => {
                  const code = formatGrid(cell.row, cell.col);
                  const selected = focus?.row === cell.row && focus?.col === cell.col;
                  const density = heat[cell.row - 1][cell.col - 1];
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-label={code}
                      aria-pressed={selected}
                      onClick={() => applyReference(code)}
                      className={cn("relative min-h-0 min-w-0", selected && "z-10")}
                      style={{
                        background: showHeat ? heatColor(density, maxHeat) : "transparent",
                        boxShadow: selected
                          ? "inset 0 0 0 2px var(--color-primary)"
                          : "inset 0 0 0 1px rgba(255,255,255,0.22)",
                      }}
                    >
                      {selected && (
                        <span className="pointer-events-none absolute left-1 top-1 font-mono text-[8px] font-semibold text-white drop-shadow">
                          {code}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-2 text-[11px] text-[var(--color-text)] shadow-sm">
              <p className="font-medium">Search density</p>
              <div className="mt-1.5 flex h-2 w-36 overflow-hidden rounded-sm">
                <span className="flex-1" style={{ background: heatColor(0.2, 1) }} />
                <span className="flex-1" style={{ background: heatColor(0.55, 1) }} />
                <span className="flex-1" style={{ background: heatColor(1, 1) }} />
              </div>
              <div className="mt-1 flex justify-between text-[var(--color-text-muted)]">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:col-span-4">
          <h2 className="text-sm font-semibold">Sector</h2>
          {focus ? (
            <div className="mt-3 space-y-3">
              <p className="font-mono text-2xl font-semibold tracking-[0.12em] text-[var(--color-primary)]">{focusCode}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[var(--color-text-muted)]">Row</dt>
                  <dd className="font-medium">{String(focus.row).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-muted)]">Column</dt>
                  <dd className="font-medium">{String(focus.col).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-muted)]">Plotted targets</dt>
                  <dd className="font-medium">{sectorTargets.length}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-text-muted)]">Concentration</dt>
                  <dd className="font-medium">{heatLabel(heat[focus.row - 1][focus.col - 1], maxHeat)}</dd>
                </div>
              </dl>
              {sectorTargets.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No plotted targets in this sector.</p>
              ) : (
                <ul className="space-y-2">
                  {sectorTargets.map((target) => (
                    <li key={target.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm">
                      <p className="font-semibold">{target.id}</p>
                      <p className="mt-0.5 text-[var(--color-text-muted)]">
                        {formatDegrees(target.latitude, "N")}, {formatDegrees(target.longitude, "E")}
                      </p>
                      <p className="text-[var(--color-text-muted)]">{target.locationType}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Choose a grid reference to center the map on that sector.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function heatLabel(value: number, max: number) {
  if (value <= 0 || max <= 0) return "None";
  const ratio = value / max;
  if (ratio >= 0.66) return "High";
  if (ratio >= 0.33) return "Moderate";
  return "Low";
}
