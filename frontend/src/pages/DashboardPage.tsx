import { ActiveAlerts } from "../components/dashboard/ActiveAlerts";
import { LiveSARMonitoring } from "../components/dashboard/LiveSARMonitoring";
import { MissionHeader } from "../components/dashboard/MissionHeader";
import { StatCards } from "../components/dashboard/StatCards";
import { useLiveSession } from "../context/LiveSessionContext";

export function DashboardPage() {
  const { sessionStatus, openAlertsCount, liveAlerts } = useLiveSession();

  return (
    <div className="space-y-3 px-4 pb-6 sm:px-5">
      <MissionHeader />
      <StatCards
        personsDetected={sessionStatus?.detection_count ?? 0}
        activeAlerts={openAlertsCount}
      />

      {/* ── Live SAR Monitoring — integrated RGB-Thermal pipeline ── */}
      <LiveSARMonitoring />

      {/* ── Brief Live Alerts ── */}
      <ActiveAlerts liveAlerts={liveAlerts} />
    </div>
  );
}
