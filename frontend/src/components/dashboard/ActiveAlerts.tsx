import { AlertTriangle, Bell, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUi } from "../../context/UiContext";
import { API_BASE_URL, getLiveAlerts, updateLiveAlertState, type LiveAlert } from "../../lib/api";
import { cn } from "../../lib/cn";
import { CardHeader, Dialog, EmptyState, Panel, ViewAllButton } from "../ui";

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { time: "", date: "" };
  return {
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
  };
}

export function ActiveAlerts({ liveAlerts }: { liveAlerts?: LiveAlert[] }) {
  const { query, setQuery, pushToast } = useUi();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<LiveAlert | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [fetchedAlerts, setFetchedAlerts] = useState<LiveAlert[]>([]);

  useEffect(() => {
    if (liveAlerts !== undefined) return;
    let active = true;
    const load = () => {
      getLiveAlerts().then((list) => { if (active) setFetchedAlerts(list); }).catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [liveAlerts]);

  const source = liveAlerts && liveAlerts.length > 0 ? [...liveAlerts].reverse() : fetchedAlerts;
  const needle = query.trim().toLowerCase();
  const items = source.filter((alert) => {
    if (hidden.includes(alert.alert_id) || alert.state === "resolved") return false;
    if (!needle) return true;
    return [alert.headline, alert.summary, alert.priority, `${Math.round(alert.confidence * 100)}%`]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  return (
    <Panel className="flex h-full flex-col">
      <CardHeader icon={<Bell className="h-4 w-4" style={{ color: "var(--sar-text-2)" }} />} title="Active Alerts">
        <ViewAllButton onClick={() => { setQuery(""); navigate("/alerts"); }} />
      </CardHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" style={{ maxHeight: "340px" }}>
        {items.length === 0 ? (
          <EmptyState
            message={needle ? "No alerts match this search." : "No active detection alerts yet."}
            action={needle ? "Clear filter" : undefined}
            onAction={needle ? () => setQuery("") : undefined}
          />
        ) : (
          items.slice(0, 15).map((alert) => {
            const high = alert.priority === "High";
            const med = alert.priority === "Medium";
            const { time, date } = fmtTime(alert.timestamp);
            const gpsText =
              alert.latitude !== null && alert.longitude !== null
                ? `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`
                : "GPS unavailable";
            return (
              <button
                key={alert.alert_id}
                type="button"
                onClick={() => setSelected(alert)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left"
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-surface-hover)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "")}
              >
                <AlertTriangle
                  className={cn("h-4 w-4 shrink-0")}
                  style={{ color: high ? "var(--sar-red)" : med ? "var(--sar-amber)" : "var(--sar-blue)" }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>
                      {alert.headline}
                    </span>
                    <span
                      className="badge-base shrink-0"
                      style={{
                        background: high ? "var(--sar-red-dim)" : med ? "var(--sar-amber-dim)" : "var(--sar-blue-dim)",
                        color: high ? "var(--sar-red)" : med ? "var(--sar-amber)" : "var(--sar-blue)",
                        border: `1px solid ${high ? "rgba(239,68,68,0.3)" : med ? "rgba(245,158,11,0.3)" : "rgba(59,130,246,0.3)"}`,
                      }}
                    >
                      {alert.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] leading-4" style={{ color: "var(--sar-text-3)" }}>
                    Confidence: {Math.round(alert.confidence * 100)}% · Frame #{alert.frame_number} · {gpsText}
                  </p>
                </div>
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-black">
                  <img
                    src={`${API_BASE_URL}${alert.crop_url}`}
                    alt="Detection crop"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div className="w-16 shrink-0 text-right text-[10px] leading-4" style={{ color: "var(--sar-text-3)" }}>
                  <div>{time}</div>
                  <div>{date}</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--sar-text-3)" }} aria-hidden="true" />
              </button>
            );
          })
        )}
      </div>

      {selected && (
        <Dialog title="Live Detection Alert" onClose={() => setSelected(null)}>
          <p className="text-sm font-semibold" style={{ color: "var(--sar-text-1)" }}>
            {selected.headline} · {selected.priority.toUpperCase()}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--sar-text-2)" }}>
            {selected.summary}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const id = selected.alert_id;
                setSelected(null);
                navigate(`/alerts/${id}`);
              }}
              className="h-9 rounded-lg text-sm font-semibold text-white"
              style={{ background: "var(--sar-blue)" }}
            >
              View Details
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await updateLiveAlertState(selected.alert_id, "acknowledged");
                } catch { /* ignore */ }
                setHidden((c) => [...c, selected.alert_id]);
                pushToast("Alert acknowledged");
                setSelected(null);
              }}
              className="h-9 rounded-lg text-sm font-medium"
              style={{ border: "1px solid var(--sar-border-2)", color: "var(--sar-text-2)" }}
            >
              Dismiss
            </button>
          </div>
        </Dialog>
      )}
    </Panel>
  );
}
