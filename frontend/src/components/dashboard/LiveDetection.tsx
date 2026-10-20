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
    <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-slate-800">
      <AerialScene mode={mode} people={people} seed={seed} className="h-full w-full" />
      {boxes.map((box) => (
        <div
          key={box.score}
          className="absolute border-2 border-red-500"
          style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
        >
          <span className="absolute -top-5 left-0 whitespace-nowrap bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
            person {box.score}
          </span>
        </div>
      ))}
      <span className="absolute bottom-2.5 left-3 text-[13px] font-semibold text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.85)]">
        {label}
      </span>
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
      <CardHeader icon={<Camera className="h-4 w-4 text-slate-500" />} title="Live Detection (RGB + Thermal)">
        <div className="flex items-center gap-2">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-expanded={open}
            >
              {model}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {open && (
              <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
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
                    className={cn(
                      "block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800",
                      option === model ? "font-semibold text-blue-600" : "text-slate-600 dark:text-slate-300",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setLive((value) => !value);
              pushToast(live ? "Live stream paused" : "Live stream resumed");
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              live ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", live ? "animate-pulse bg-emerald-500" : "bg-slate-400")} />
            {live ? "Live" : "Paused"}
          </button>
          <button
            type="button"
            aria-label="Expand live detection"
            onClick={() => setExpanded(true)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <div className="px-4 pb-4">{frames}</div>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setExpanded(false)}>
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-4 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Live Detection (RGB + Thermal)</h2>
              <button
                type="button"
                aria-label="Close expanded view"
                onClick={() => setExpanded(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
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
