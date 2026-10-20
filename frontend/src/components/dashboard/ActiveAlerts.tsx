import { AlertTriangle, Bell, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { alerts, matchesQuery, type AlertItem } from "../../data/mission";
import { useUi } from "../../context/UiContext";
import { cn } from "../../lib/cn";
import { AerialScene } from "./AerialScene";
import { CardHeader, Dialog, Panel, ViewAllButton } from "../ui";

export function ActiveAlerts() {
  const { query, setQuery, pushToast } = useUi();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const items = alerts.filter(
    (alert) =>
      !hidden.includes(alert.id) &&
      matchesQuery(query, [
        "person detected",
        alert.severity,
        alert.confidence,
        alert.location,
        alert.time,
        alert.date,
      ]),
  );

  return (
    <Panel className="flex h-full flex-col">
      <CardHeader icon={<Bell className="h-4 w-4 text-slate-500" />} title="Active Alerts">
        <ViewAllButton
          onClick={() => {
            setQuery("");
            navigate("/alerts");
          }}
        />
      </CardHeader>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {items.length === 0 && (
          <div className="px-2 py-4 text-sm text-slate-400">
            No alerts match this search.
            <button type="button" onClick={() => setQuery("")} className="ml-2 font-medium text-blue-600">
              Reset search
            </button>
          </div>
        )}
        {items.map((alert) => {
          const high = alert.severity === "HIGH";
          return (
            <button
              key={alert.id}
              type="button"
              onClick={() => setSelected(alert)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <AlertTriangle
                className={cn("h-5 w-5 shrink-0", high ? "fill-red-100 text-red-500" : "fill-amber-100 text-amber-400")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Person Detected
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white",
                      high ? "bg-red-500" : "bg-amber-400",
                    )}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                  Confidence: {alert.confidence}
                  <br />
                  Location: {alert.location}
                </p>
              </div>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                <AerialScene mode="thumb" seed={alert.seed} people={[{ x: 50, y: 46 }]} className="h-full w-full" />
              </div>
              <div className="w-[72px] shrink-0 text-right text-[11px] leading-4 text-slate-400">
                <div>{alert.time}</div>
                <div>{alert.date}</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          );
        })}
      </div>
      {selected && (
        <Dialog title="Alert resolution" onClose={() => setSelected(null)}>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Person Detected · {selected.severity}</p>
          <p className="mt-1 text-sm text-slate-500">
            Confidence {selected.confidence} at {selected.location}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {selected.time} · {selected.date}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const id = selected.id;
                setSelected(null);
                pushToast("Alert opened for acknowledgement");
                navigate(`/alerts/${id}`);
              }}
              className="h-10 rounded-xl bg-blue-600 text-sm font-semibold text-white"
            >
              Acknowledge
            </button>
              <button
                type="button"
                onClick={() => {
                  setHidden((current) => [...current, selected.id]);
                  pushToast("Alert dismissed from the dashboard");
                  setSelected(null);
                }}
                className="h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
              >
                Dismiss
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                pushToast(`Alert ${selected.id} escalated to the operator`);
                setSelected(null);
              }}
              className="mt-2 h-10 w-full rounded-xl bg-orange-50 text-sm font-semibold text-orange-700"
            >
              Escalate
            </button>
        </Dialog>
      )}
    </Panel>
  );
}
