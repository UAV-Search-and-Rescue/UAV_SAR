import { ActiveAlerts } from "../components/dashboard/ActiveAlerts";
import { DualStream } from "../components/dashboard/DualStream";
import { MissionHeader } from "../components/dashboard/MissionHeader";
import { RecentDetections } from "../components/dashboard/RecentDetections";
import { StatCards } from "../components/dashboard/StatCards";

export function DashboardPage() {
  return (
    <div className="w-full space-y-5 px-4 pb-8 pt-2 font-sans text-[var(--color-text)] sm:px-5 lg:px-6">
      <MissionHeader />
      <StatCards />
      <DualStream />
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <RecentDetections />
        <ActiveAlerts />
      </div>
    </div>
  );
}
