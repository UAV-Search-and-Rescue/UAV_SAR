import { Compass, MapPin, Minus, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useUi } from "../../context/UiContext";
import { UavMark } from "../icons";
import { CardHeader, Panel, ViewAllButton } from "../ui";
import { AerialScene } from "./AerialScene";

const markers = [
  { id: "T2", kind: "alert" as const, left: "58%", top: "18%" },
  { id: "T1", kind: "alert" as const, left: "63%", top: "42%" },
  { id: "T3", kind: "alert" as const, left: "78%", top: "64%" },
];

export function TargetMap() {
  const { setQuery } = useUi();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1);

  return (
    <Panel className="flex h-full flex-col">
      <CardHeader icon={<MapPin className="h-4 w-4 text-blue-500" />} title="Target Locations">
        <ViewAllButton
          onClick={() => {
            setQuery("");
            navigate("/localization");
          }}
        />
      </CardHeader>
      <div className="relative mx-4 mb-4 min-h-[280px] flex-1 overflow-hidden rounded-xl bg-[#16351f]">
        <div
          className="absolute inset-0 origin-center transition-transform"
          style={{ transform: `scale(${zoom})` }}
        >
          <AerialScene mode="map" seed={15} className="h-full w-full" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M30 58 C 40 54, 46 46, 52 42 S 60 30, 58 20"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.9"
              strokeDasharray="2.2 1.5"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute left-[30%] top-[52%] -translate-x-1/2 -translate-y-1/2 text-blue-500 drop-shadow">
            <UavMark className="h-7 w-7" />
          </div>
          <div className="absolute left-[52%] top-[48%] -translate-x-1/2 -translate-y-full">
            <svg viewBox="0 0 24 32" className="h-8 w-6 drop-shadow" aria-label="Detected person">
              <path d="M12 0c6 0 10 4.4 10 10.2C22 18 12 32 12 32S2 18 2 10.2C2 4.4 6 0 12 0z" fill="#ef4444" />
              <circle cx="12" cy="10" r="3.4" fill="white" />
            </svg>
          </div>
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: marker.left, top: marker.top }}
            >
              <div className="grid h-7 w-7 place-items-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow ring-2 ring-white">
                {marker.id}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute right-3 top-3 w-[148px] rounded-xl bg-white/95 p-2.5 text-[11px] text-slate-600 shadow-md">
          <LegendRow swatch={<span className="h-2.5 w-2.5 rounded-full bg-red-500" />} label="Detected Person" />
          <LegendRow swatch={<span className="h-2.5 w-2.5 rounded-full bg-orange-500" />} label="Alert (Unverified)" />
          <LegendRow swatch={<UavMark className="h-3.5 w-3.5 text-blue-500" />} label="Drone Position" />
          <LegendRow
            swatch={<span className="h-0 w-4 border-t-2 border-dashed border-blue-500" />}
            label="Search Route"
          />
        </div>

        <div className="absolute bottom-16 right-3 flex flex-col gap-1.5">
          <MapButton label="Zoom in" onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.2).toFixed(2))))}>
            <Plus className="h-4 w-4" />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => setZoom((value) => Math.max(1, Number((value - 0.2).toFixed(2))))}>
            <Minus className="h-4 w-4" />
          </MapButton>
          <MapButton label="Reset map" onClick={() => setZoom(1)}>
            <Compass className="h-4 w-4" />
          </MapButton>
        </div>

        <div className="absolute bottom-3 right-3 rounded-md bg-white/95 px-2 py-1 shadow">
          <div className="flex items-end text-[10px] font-medium text-slate-600">
            <div>
              <div className="h-2 w-10 border border-slate-800 bg-white" />
              <div className="mt-0.5 flex justify-between">
                <span>0</span>
                <span>250</span>
              </div>
            </div>
            <div>
              <div className="h-2 w-10 border border-slate-800 bg-slate-800" />
              <div className="mt-0.5 text-right">500 m</div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function LegendRow({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="grid w-4 place-items-center">{swatch}</span>
      <span>{label}</span>
    </div>
  );
}

function MapButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md bg-white text-slate-600 shadow hover:text-slate-900"
    >
      {children}
    </button>
  );
}
