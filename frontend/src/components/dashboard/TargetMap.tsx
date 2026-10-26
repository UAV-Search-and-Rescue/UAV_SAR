import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import { CardHeader, Panel } from "../ui";

function MapZoomControls() {
  const map = useMap();
  const buttonClass =
    "h-9 w-9 text-lg font-medium text-[var(--color-text)] hover:bg-[var(--color-background)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]";

  return (
    <div
      aria-label="Map zoom controls"
      className="absolute right-3 top-3 z-[1101] flex flex-col overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-sm"
    >
      <button
        type="button"
        aria-label="Zoom in"
        className={`${buttonClass} border-b border-[var(--color-border)]`}
        onClick={() => map.zoomIn()}
      >
        +
      </button>
      <button type="button" aria-label="Zoom out" className={buttonClass} onClick={() => map.zoomOut()}>
        −
      </button>
    </div>
  );
}

export function TargetMap() {
  return (
    <Panel className="flex min-h-[400px] flex-col overflow-hidden">
      <CardHeader icon={<MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />} title="Target map">
        <span className="text-xs text-[var(--color-text-muted)]">OpenStreetMap · street layer</span>
      </CardHeader>
      <div
        role="region"
        aria-label="Interactive OpenStreetMap"
        className="relative mx-3 mb-3 min-h-[340px] flex-1 overflow-hidden rounded-lg border border-[var(--color-border)]"
      >
        <MapContainer
          center={[20, 15]}
          zoom={3}
          minZoom={2}
          maxZoom={19}
          scrollWheelZoom={false}
          zoomControl={false}
          className="h-full min-h-[340px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapZoomControls />
        </MapContainer>
        <div
          role="status"
          aria-label="Map status"
          className="pointer-events-none absolute left-3 top-3 z-[1100] max-w-[calc(100%_-_4.5rem)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/95 px-3 py-2 shadow-sm"
        >
          <p className="text-sm font-semibold text-[var(--color-text)]">No geographic coordinates available.</p>
          <Link
            to="/localization"
            className="pointer-events-auto mt-1 inline-block text-xs font-medium text-blue-700 underline underline-offset-2 dark:text-blue-300"
          >
            Open localization
          </Link>
        </div>
      </div>
    </Panel>
  );
}
