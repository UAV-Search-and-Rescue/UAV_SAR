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
      <CardHeader icon={<MapPin className="h-4 w-4" style={{ color: "var(--sar-blue)" }} />} title="Target Locations">
        <ViewAllButton
          onClick={() => {
            setQuery("");
            navigate("/localization");
          }}
        />
      </CardHeader>

      <div
        className="relative mx-4 mb-4 min-h-[280px] flex-1 overflow-hidden rounded-xl"
        style={{ background: "#0d1a10" }}
        aria-label="Operational map — demo data, not a live GPS feed"
        role="img"
      >
        <div
          className="absolute inset-0 origin-center"
          style={{ transform: `scale(${zoom})`, transition: "transform 0.2s ease" }}
        >
          <AerialScene mode="map" seed={15} className="h-full w-full" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M30 58 C 40 54, 46 46, 52 42 S 60 30, 58 20"
              fill="none"
              stroke="var(--sar-blue)"
              strokeWidth="0.9"
              strokeDasharray="2.2 1.5"
              strokeLinecap="round"
            />
          </svg>
          {/* Drone */}
          <div className="absolute left-[30%] top-[52%] -translate-x-1/2 -translate-y-1/2" style={{ color: "var(--sar-teal)" }}>
            <UavMark className="h-7 w-7 drop-shadow" />
          </div>
          {/* Person pin */}
          <div className="absolute left-[52%] top-[48%] -translate-x-1/2 -translate-y-full">
            <svg viewBox="0 0 24 32" className="h-8 w-6 drop-shadow" aria-label="Detected person">
              <path d="M12 0c6 0 10 4.4 10 10.2C22 18 12 32 12 32S2 18 2 10.2C2 4.4 6 0 12 0z" fill="var(--sar-red)" />
              <circle cx="12" cy="10" r="3.4" fill="white" />
            </svg>
          </div>
          {/* Alert markers */}
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: marker.left, top: marker.top }}
              aria-label={`Alert marker ${marker.id}`}
            >
              <div
                className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white shadow-lg"
                style={{ background: "var(--sar-amber)", border: "2px solid rgba(255,255,255,0.2)" }}
              >
                {marker.id}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          className="absolute right-2 top-2 rounded-lg p-2 text-[10px]"
          style={{ background: "rgba(11,17,32,0.85)", border: "1px solid var(--sar-border-2)" }}
        >
          <LegendRow swatch={<span className="h-2 w-2 rounded-full" style={{ background: "var(--sar-red)" }} />} label="Person" />
          <LegendRow swatch={<span className="h-2 w-2 rounded-full" style={{ background: "var(--sar-amber)" }} />} label="Alert" />
          <LegendRow swatch={<UavMark className="h-3 w-3" style={{ color: "var(--sar-teal)" }} />} label="Drone" />
          <LegendRow
            swatch={<span className="h-0 w-4" style={{ borderTop: "1.5px dashed var(--sar-blue)" }} />}
            label="Route"
          />
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-14 right-2 flex flex-col gap-1">
          <MapButton label="Zoom in" onClick={() => setZoom((v) => Math.min(1.8, Number((v + 0.2).toFixed(2))))}>
            <Plus className="h-3.5 w-3.5" />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => setZoom((v) => Math.max(1, Number((v - 0.2).toFixed(2))))}>
            <Minus className="h-3.5 w-3.5" />
          </MapButton>
          <MapButton label="Reset map" onClick={() => setZoom(1)}>
            <Compass className="h-3.5 w-3.5" />
          </MapButton>
        </div>

        {/* Scale bar */}
        <div
          className="absolute bottom-2 right-2 rounded-md px-2 py-1 text-[9px]"
          style={{ background: "rgba(11,17,32,0.85)", border: "1px solid var(--sar-border)", color: "var(--sar-text-2)" }}
        >
          <div className="flex items-end">
            <div>
              <div className="flex">
                <div className="h-1.5 w-8" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.3)" }} />
                <div className="h-1.5 w-8" style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }} />
              </div>
              <div className="mt-0.5 flex justify-between">
                <span>0</span>
                <span>250</span>
                <span>500 m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo watermark */}
        <div
          className="absolute bottom-2 left-2 text-[9px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Demo data
        </div>
      </div>
    </Panel>
  );
}

function LegendRow({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5" style={{ color: "var(--sar-text-2)" }}>
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
      className="grid h-7 w-7 place-items-center rounded-md shadow"
      style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border-2)", color: "var(--sar-text-2)" }}
      onMouseOver={(e) => (e.currentTarget.style.color = "var(--sar-teal)")}
      onMouseOut={(e) => (e.currentTarget.style.color = "var(--sar-text-2)")}
    >
      {children}
    </button>
  );
}
