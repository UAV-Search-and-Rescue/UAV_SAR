import { Camera, ChevronDown, Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  matchesQuery,
  modelOptions,
  rgbBoxes,
  thermalBoxes,
  type DetectionBox,
} from "../../data/mission";
import { useUi } from "../../context/UiContext";
import { cn } from "../../lib/cn";
import { CardHeader, Panel } from "../ui";
import { AerialScene } from "./AerialScene";

function boxesForQuery(boxes: DetectionBox[], channel: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return boxes;
  const related =
    needle.includes(channel) ||
    needle.includes("person") ||
    boxes.some((box) => box.score.includes(needle));
  if (!related) return boxes;
  return boxes.filter((box) => matchesQuery(needle, ["person", box.score, channel]));
}

function Frame({
  label,
  mode,
  boxes,
  seed,
}: {
  label: string;
  mode: "rgb" | "thermal";
  boxes: DetectionBox[];
  seed: number;
}) {
  const people = boxes.map((box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 }));

  return (
    <div className="relative aspect-[5/4] overflow-hidden rounded-xl" style={{ background: "#0d1a0e" }}>
      <AerialScene mode={mode} people={people} seed={seed} className="h-full w-full" />
      {boxes.map((box) => (
        <div
          key={box.score}
          className="absolute"
          style={{
            left: `${box.x}%`, top: `${box.y}%`,
            width: `${box.w}%`, height: `${box.h}%`,
            border: "1.5px solid var(--sar-red)",
          }}
        >
          <span className="bbox-label">person {box.score}</span>
        </div>
      ))}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2.5 py-2"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
      >
        <span className="text-xs font-semibold text-white drop-shadow">{label}</span>
        <span className="badge-base" style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.6)", border: "none", fontSize: "10px" }}>
          Demo data
        </span>
      </div>
    </div>
  );
}

export function LiveDetection() {
  const { query, pushToast } = useUi();
  const [model, setModel] = useState<(typeof modelOptions)[number]>("YOLO E0");
  const [live, setLive] = useState(true);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const visibleRgb = model === "YOLO E1" || !live ? [] : boxesForQuery(rgbBoxes, "rgb", query);
  const visibleThermal = !live ? [] : boxesForQuery(thermalBoxes, "thermal", query);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const frames = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Frame label="RGB Image" mode="rgb" boxes={visibleRgb} seed={4} />
      <Frame label="Thermal Image" mode="thermal" boxes={visibleThermal} seed={8} />
    </div>
  );

  return (
    <Panel className="flex h-full flex-col">
      <CardHeader icon={<Camera className="h-4 w-4" style={{ color: "var(--sar-text-2)" }} />} title="Live Detection (RGB + Thermal)">
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="badge-base badge-muted cursor-pointer"
              aria-expanded={open}
            >
              {model}
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </button>
            {open && (
              <div
                className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl py-1"
                style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border-2)", boxShadow: "var(--shadow-popup)" }}
              >
                {modelOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setModel(option);
                      setOpen(false);
                      pushToast(
                        option === "YOLO E2"
                          ? "E2 fusion is not available yet. Showing both streams."
                          : `Model checkpoint switched to ${option}`,
                      );
                    }}
                    className={cn("block w-full px-3 py-1.5 text-left text-xs")}
                    style={{ color: option === model ? "var(--sar-teal)" : "var(--sar-text-2)", fontWeight: option === model ? 600 : 400 }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-surface-hover)")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "")}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live / Paused toggle */}
          <button
            type="button"
            onClick={() => { setLive((v) => !v); pushToast(live ? "Live stream paused" : "Live stream resumed"); }}
            className={cn("badge-base", live ? "badge-green" : "badge-muted")}
            aria-pressed={live}
          >
            <span
              className={cn("conn-dot", live ? "online" : "")}
              style={{ background: live ? "var(--sar-green)" : "var(--sar-text-3)" }}
            />
            {live ? "Live" : "Paused"}
          </button>

          {/* Expand */}
          <button
            type="button"
            aria-label="Expand live detection"
            onClick={() => setExpanded(true)}
            className="grid h-7 w-7 place-items-center rounded-lg"
            style={{ color: "var(--sar-text-3)" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-surface-2)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "")}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>
      <div className="px-4 pb-4">{frames}</div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setExpanded(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl p-4"
            style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border-2)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>Live Detection — Demo Data</h2>
              <button
                type="button"
                aria-label="Close expanded view"
                onClick={() => setExpanded(false)}
                className="grid h-8 w-8 place-items-center rounded-lg"
                style={{ color: "var(--sar-text-2)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {frames}
          </div>
        </div>
      )}
    </Panel>
  );
}
