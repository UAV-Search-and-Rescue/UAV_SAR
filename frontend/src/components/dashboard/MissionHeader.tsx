import { RotateCcw } from "lucide-react";
import { useLiveSession } from "../../context/LiveSessionContext";

export function MissionHeader() {
  const { handleResetAll } = useLiveSession();

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--sar-text-1)" }}>
          UAV SAR Dashboard
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--sar-text-2)" }}>
          Real-time RGB-Thermal person detection &amp; search-and-rescue alerting
        </p>
      </div>

      <button
        id="sar-reset-all-btn"
        type="button"
        onClick={() => void handleResetAll()}
        className="inline-flex items-center gap-2 self-start rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:opacity-90 sm:self-auto"
        style={{
          background: "var(--sar-surface-2)",
          border: "1px solid var(--sar-border-2)",
          color: "var(--sar-text-1)",
          backdropFilter: "blur(12px)",
        }}
      >
        <RotateCcw className="h-3.5 w-3.5" style={{ color: "var(--sar-red)" }} />
        Reset All Detections &amp; Alerts
      </button>
    </div>
  );
}
