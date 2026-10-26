export const GRID_ROWS = 20;
export const GRID_COLS = 20;
export const FOCUS_SCALE = 5;

export type GridCell = { row: number; col: number };

export function formatGrid(row: number, col: number) {
  return `R${String(row).padStart(2, "0")}C${String(col).padStart(2, "0")}`;
}

export function parseGridReference(value: string): GridCell | null {
  const match = value.trim().toUpperCase().match(/^R(\d{2})C(\d{2})$/);
  if (!match) return null;
  const row = Number(match[1]);
  const col = Number(match[2]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  if (row < 1 || row > GRID_ROWS || col < 1 || col > GRID_COLS) return null;
  return { row, col };
}

export function cellFromPercent(x: number, y: number): GridCell {
  const col = Math.min(GRID_COLS, Math.max(1, Math.floor((x / 100) * GRID_COLS) + 1));
  const row = Math.min(GRID_ROWS, Math.max(1, Math.floor((y / 100) * GRID_ROWS) + 1));
  return { row, col };
}

export function focusTransform(cell: GridCell | null) {
  if (!cell) return "none";
  const fx = (cell.col - 0.5) / GRID_COLS;
  const fy = (cell.row - 0.5) / GRID_ROWS;
  const x = 50 - fx * 100 * FOCUS_SCALE;
  const y = 50 - fy * 100 * FOCUS_SCALE;
  return `translate(${x}%, ${y}%) scale(${FOCUS_SCALE})`;
}

export function heatColor(value: number, max: number) {
  if (value <= 0 || max <= 0) return "transparent";
  const intensity = Math.min(1, value / max);
  const hue = 46 - intensity * 46;
  const alpha = 0.16 + intensity * 0.5;
  return `hsla(${hue}, 92%, 52%, ${alpha})`;
}
