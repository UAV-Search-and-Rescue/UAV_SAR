import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LiveDetection } from "../../lib/api";

export function SatelliteMap({
  detections,
  droneLat,
  droneLon,
}: {
  detections: LiveDetection[];
  droneLat?: number;
  droneLon?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [layerMode, setLayerMode] = useState<"satellite" | "street">("satellite");

  const validDetections = detections.filter(
    (d) => d.latitude !== null && d.longitude !== null,
  );
  const hasDroneGps =
    typeof droneLat === "number" &&
    typeof droneLon === "number" &&
    (droneLat !== 0 || droneLon !== 0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialLat = hasDroneGps ? droneLat! : 21.0285;
    const initialLon = hasDroneGps ? droneLon! : 105.8542;

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLon],
      zoom: hasDroneGps ? 18 : 3,
      zoomControl: true,
      attributionControl: false,
    });

    const satLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 20 },
    ).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    tileLayerRef.current = satLayer;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const url =
      layerMode === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    tileLayerRef.current = L.tileLayer(url, { maxZoom: 20 }).addTo(map);
  }, [layerMode]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (hasDroneGps) {
      L.circleMarker([droneLat!, droneLon!], {
        radius: 6,
        color: "#2dd4bf",
        fillColor: "#2dd4bf",
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindTooltip("UAV Position")
        .addTo(group);
    }

    for (const det of validDetections) {
      L.circleMarker([det.latitude!, det.longitude!], {
        radius: 5,
        color: "#ef4444",
        fillColor: "#f87171",
        fillOpacity: 0.9,
        weight: 1.5,
      })
        .bindTooltip(`Person (${Math.round(det.confidence * 100)}%)`)
        .addTo(group);
    }

    if (validDetections.length > 0) {
      const first = validDetections[0];
      map.setView([first.latitude!, first.longitude!], Math.max(map.getZoom(), 18), {
        animate: false,
      });
    } else if (hasDroneGps) {
      map.setView([droneLat!, droneLon!], Math.max(map.getZoom(), 18), {
        animate: false,
      });
    }
  }, [validDetections, hasDroneGps, droneLat, droneLon]);

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-xl"
      style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border)" }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--sar-border)" }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--sar-text-3)" }}>
          Satellite Map
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLayerMode("satellite")}
            className="rounded px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: layerMode === "satellite" ? "var(--sar-teal-dim)" : "transparent",
              color: layerMode === "satellite" ? "var(--sar-teal)" : "var(--sar-text-3)",
            }}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setLayerMode("street")}
            className="rounded px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: layerMode === "street" ? "var(--sar-teal-dim)" : "transparent",
              color: layerMode === "street" ? "var(--sar-teal)" : "var(--sar-text-3)",
            }}
          >
            Street
          </button>
        </div>
      </div>

      <div className="relative h-56 w-full">
        <div ref={containerRef} className="h-full w-full" />
        {!hasDroneGps && validDetections.length === 0 && (
          <div
            className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] rounded-lg px-2.5 py-1.5 text-center text-[10px]"
            style={{ background: "rgba(11,17,32,0.85)", color: "var(--sar-text-2)", border: "1px solid var(--sar-border)" }}
          >
            GPS unavailable — enter Drone Lat/Lon/Alt in Config tab to plot live coordinates
          </div>
        )}
      </div>
    </div>
  );
}
