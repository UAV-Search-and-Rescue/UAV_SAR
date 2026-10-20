import { ActiveAlerts } from "../components/dashboard/ActiveAlerts";
import { LiveDetection } from "../components/dashboard/LiveDetection";
import { MissionHeader } from "../components/dashboard/MissionHeader";
import { RecentDetections } from "../components/dashboard/RecentDetections";
import { StatCards } from "../components/dashboard/StatCards";
import { TargetMap } from "../components/dashboard/TargetMap";

export function DashboardPage() {
  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5">
      <MissionHeader />
      <StatCards />
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <LiveDetection />
        </div>
        <div className="xl:col-span-2">
          <TargetMap />
        </div>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecentDetections />
        </div>
        <div className="xl:col-span-2">
          <ActiveAlerts />
        </div>
      </div>
    </div>
  );
}
