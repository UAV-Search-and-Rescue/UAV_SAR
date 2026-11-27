import { List, MapPin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { matchesQuery, recentDetections, type RecentDetection } from "../../data/mission";
import { useUi } from "../../context/UiContext";
import { AerialScene } from "./AerialScene";
import { CardHeader, ConfBadge, Dialog, EmptyState, Panel, ViewAllButton } from "../ui";

export function RecentDetections() {
  const { query, setQuery } = useUi();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<RecentDetection | null>(null);
  const items = recentDetections.filter((item) =>
    matchesQuery(query, [item.id, item.score, item.when, item.location, "person detected"]),
  );

  const scoreNum = (s: string) => parseFloat(s);

  return (
    <Panel>
      <CardHeader icon={<List className="h-4 w-4" style={{ color: "var(--sar-text-2)" }} />} title="Recent Detections">
        <ViewAllButton onClick={() => { setQuery(""); navigate("/results"); }} />
      </CardHeader>
      {items.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyState message="No detections match this search." action="Clear filter" onAction={() => setQuery("")} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="overflow-hidden rounded-xl text-left"
              style={{
                background: "var(--sar-surface-2)",
                border: "1px solid var(--sar-border)",
                transition: "border-color 0.15s, transform 0.15s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--sar-teal-border)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--sar-border)";
                (e.currentTarget as HTMLElement).style.transform = "";
              }}
            >
              <div className="relative aspect-[4/3]" style={{ background: "#0d1a0e" }}>
                <AerialScene
                  mode="thumb"
                  seed={item.seed}
                  people={[{ x: 50, y: 48 }]}
                  className="h-full w-full"
                />
                <div
                  className="pointer-events-none absolute left-[34%] top-[18%] h-[62%] w-[32%]"
                  style={{ border: "1.5px solid var(--sar-red)" }}
                />
                <div className="absolute bottom-1.5 left-1.5">
                  <ConfBadge confidence={scoreNum(item.score)} />
                </div>
              </div>
              <div className="px-2.5 py-2">
                <div className="text-xs font-semibold" style={{ color: "var(--sar-text-1)" }}>{item.id}</div>
                <div className="mt-0.5 text-[10px]" style={{ color: "var(--sar-text-3)" }}>{item.when}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: "var(--sar-text-3)" }}>
                  <MapPin className="h-2.5 w-2.5 shrink-0" style={{ color: "var(--sar-blue)" }} aria-hidden="true" />
                  <span className="truncate">{item.location}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Dialog title={`Detection ${selected.id}`} onClose={() => setSelected(null)}>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl" style={{ background: "#0d1a0e" }}>
            <AerialScene mode="rgb" seed={selected.seed} people={[{ x: 50, y: 46 }]} className="h-full w-full" />
            <span
              className="absolute left-[42%] top-[24%] h-[40%] w-[16%]"
              style={{ border: "1.5px solid var(--sar-red)" }}
            >
              <span className="bbox-label">person {selected.score}</span>
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt style={{ color: "var(--sar-text-2)" }}>Confidence</dt>
              <dd className="font-medium" style={{ color: "var(--sar-text-1)" }}>{selected.score}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: "var(--sar-text-2)" }}>Timestamp</dt>
              <dd className="font-medium" style={{ color: "var(--sar-text-1)" }}>{selected.when}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: "var(--sar-text-2)" }}>GPS</dt>
              <dd className="font-medium font-mono text-xs" style={{ color: "var(--sar-text-1)" }}>{selected.location}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => navigate(`/results/R024?score=${selected.score}`)}
            className="mt-4 h-9 w-full rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--sar-blue)" }}
          >
            Open in Results
          </button>
        </Dialog>
      )}
    </Panel>
  );
}
