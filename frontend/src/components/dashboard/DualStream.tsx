import { Flame, Scan } from "lucide-react";
import { rgbBoxes, thermalBoxes, type DetectionBox } from "../../data/mission";
import { cn } from "../../lib/cn";
import { AerialScene } from "./AerialScene";
import { hudPanel } from "./hud";

type Channel = "rgb" | "thermal";

const channels: {
  id: Channel;
  label: string;
  code: string;
  boxes: DetectionBox[];
  seed: number;
  accent: "primary" | "warning";
  icon: typeof Scan;
}[] = [
  {
    id: "rgb",
    label: "RGB optical",
    code: "RGB",
    boxes: rgbBoxes,
    seed: 4,
    accent: "primary",
    icon: Scan,
  },
  {
    id: "thermal",
    label: "Thermal / IR",
    code: "IR",
    boxes: thermalBoxes,
    seed: 8,
    accent: "warning",
    icon: Flame,
  },
];

export function DualStream() {
  return (
    <section aria-label="Parallel RGB and thermal feeds" className={cn(hudPanel, "w-full p-4 sm:p-5")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Sensor comparison
          </p>
          <h2 className="mt-1 font-sans text-lg font-semibold tracking-tight text-[var(--color-text)]">Parallel feeds</h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          RGB · IR
        </p>
      </div>

      <div className="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        {channels.map((channel) => (
          <FeedPane key={channel.id} channel={channel} />
        ))}
      </div>
    </section>
  );
}

function FeedPane({
  channel,
}: {
  channel: (typeof channels)[number];
}) {
  const Icon = channel.icon;
  const boxes = channel.boxes;
  const peak = boxes.length
    ? boxes.reduce((best, box) => (Number(box.score) > Number(best) ? box.score : best), boxes[0].score)
    : null;
  const people = boxes.map((box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 }));
  const primary = channel.accent === "primary";

  return (
    <article className="min-w-0 w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            aria-hidden="true"
            className={cn("h-4 w-4 shrink-0", primary ? "text-[var(--color-primary)]" : "text-[var(--color-warning)]")}
          />
          <h3 className="truncate font-sans text-sm font-semibold text-[var(--color-text)]">{channel.label}</h3>
        </div>
        <span
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.18em]",
            primary ? "text-[var(--color-primary)]" : "text-[var(--color-warning)]",
          )}
        >
          {channel.code}
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-background)]">
        <div className="absolute inset-y-0 left-1/2 aspect-square h-full -translate-x-1/2">
          <AerialScene mode={channel.id} people={people} seed={channel.seed} className="h-full w-full" />
          {boxes.map((box) => (
            <div
              key={`${channel.id}-${box.score}-${box.x}-${box.y}`}
              className={cn("absolute border-2", primary ? "border-[var(--color-primary)]" : "border-[var(--color-warning)]")}
              style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
            >
              <span
                className={cn(
                  "absolute left-0 top-0 z-10 w-max -translate-y-1/2 whitespace-nowrap px-1 py-0.5 font-mono text-[10px] font-semibold leading-none text-[var(--color-surface)]",
                  primary ? "bg-[var(--color-primary)]" : "bg-[var(--color-warning)]",
                )}
              >
                {box.score}
              </span>
            </div>
          ))}
        </div>
        <CornerBrackets accent={channel.accent} />
        <span className="pointer-events-none absolute bottom-2 left-3 rounded bg-[var(--color-surface)]/85 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-text)]">
          {boxes.length ? `${boxes.length} tracks` : "—"}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 px-3 py-3 font-mono text-[11px] uppercase tracking-[0.14em]">
        <Telemetry label="Objects" value={boxes.length ? String(boxes.length).padStart(2, "0") : "—"} />
        <Telemetry label="Peak" value={peak ?? "Unavailable"} />
        <Telemetry label="Status" value={boxes.length ? "Preview" : "Unavailable"} />
      </dl>
    </article>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-1 truncate text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

function CornerBrackets({ accent }: { accent: "primary" | "warning" }) {
  const edge = accent === "primary" ? "border-[var(--color-primary)]" : "border-[var(--color-warning)]";
  const corner = `pointer-events-none absolute h-3.5 w-3.5 ${edge}`;
  return (
    <>
      <span className={`${corner} left-2 top-2 border-l border-t`} />
      <span className={`${corner} right-2 top-2 border-r border-t`} />
      <span className={`${corner} bottom-2 left-2 border-b border-l`} />
      <span className={`${corner} bottom-2 right-2 border-b border-r`} />
    </>
  );
}
