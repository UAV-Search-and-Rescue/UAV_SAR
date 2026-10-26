import { lazy, Suspense } from "react";
import { ActiveAlerts } from "../components/dashboard/ActiveAlerts";
import { LiveDetection } from "../components/dashboard/LiveDetection";
import { MissionHeader } from "../components/dashboard/MissionHeader";
import { RecentDetections } from "../components/dashboard/RecentDetections";
import { StatCards } from "../components/dashboard/StatCards";
import { Panel } from "../components/ui";

const TargetMap = lazy(() =>
  import("../components/dashboard/TargetMap").then((module) => ({ default: module.TargetMap })),
);

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 pb-8 pt-2 sm:px-6 lg:px-7">
      <MissionHeader />
      <StatCards />
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Suspense
            fallback={
              <Panel className="grid min-h-[400px] place-items-center text-sm text-[var(--color-text-muted)]">
                Loading map...
              </Panel>
            }
          >
            <TargetMap />
          </Suspense>
        </div>
        <div className="xl:col-span-2">
          <LiveDetection />
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
