import { List, MapPin } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { matchesQuery, recentDetections, type RecentDetection } from "../../data/mission";
import { useUi } from "../../context/UiContext";
import { AerialScene } from "./AerialScene";
import { CardHeader, Dialog, Panel, ViewAllButton } from "../ui";

export function RecentDetections() {
  const { query, setQuery } = useUi();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<RecentDetection | null>(null);
  const items = recentDetections.filter((item) =>
    matchesQuery(query, [item.id, item.score, item.when, item.location, "person detected"]),
  );

  return (
    <Panel>
      <CardHeader icon={<List className="h-4 w-4 text-slate-500" />} title="Recent Detections">
        <ViewAllButton
          onClick={() => {
            setQuery("");
            navigate("/results");
          }}
        />
      </CardHeader>
      {items.length === 0 ? (
        <div className="px-4 pb-5 text-sm text-slate-400">
          No detections match this search.
          <button type="button" onClick={() => setQuery("")} className="ml-2 font-medium text-blue-600">
            Reset search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 lg:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="overflow-hidden rounded-xl border border-slate-100 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="relative aspect-[4/3] bg-slate-800">
                <AerialScene
                  mode="thumb"
                  seed={item.seed}
                  people={[{ x: 50, y: 48 }]}
                  className="h-full w-full"
                />
                <div className="pointer-events-none absolute left-[34%] top-[18%] h-[62%] w-[32%] border-2 border-red-500" />
                <span className="absolute bottom-2 left-2 rounded bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {item.score}
                </span>
              </div>
              <div className="px-2.5 py-2">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.id}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">{item.when}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0 text-blue-500" />
                  <span className="truncate">{item.location}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <Dialog title={`Detection ${selected.id}`} onClose={() => setSelected(null)}>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-900">
            <AerialScene mode="rgb" seed={selected.seed} people={[{ x: 50, y: 46 }]} className="h-full w-full" />
            <span className="absolute left-[42%] top-[24%] h-[40%] w-[16%] border-2 border-red-500">
              <span className="absolute -top-5 left-0 bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                person {selected.score}
              </span>
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">Confidence</dt><dd className="font-medium">{selected.score}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Timestamp</dt><dd className="font-medium">{selected.when}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">GPS</dt><dd className="font-medium">{selected.location}</dd></div>
          </dl>
          <button
            type="button"
            onClick={() => navigate(`/results/R024?score=${selected.score}`)}
            className="mt-4 h-10 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white"
          >
            Open in Results
          </button>
        </Dialog>
      )}
    </Panel>
  );
}
