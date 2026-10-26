import { Camera, CircleHelp } from "lucide-react";
import { Link } from "react-router-dom";
import { CardHeader, Panel } from "../ui";

export function LiveDetection() {
  return (
    <Panel className="flex h-full flex-col">
      <CardHeader icon={<Camera className="h-4 w-4 text-slate-500" />} title="Latest detection" />
      <div className="mx-4 mb-4 flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-5 text-center">
        <CircleHelp className="h-8 w-8 text-[var(--color-text-muted)]" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">No live detection feed configured</p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--color-text-muted)]">
          Connect the detection API to show a current camera frame and verified results.
        </p>
        <Link
          to="/detection"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 focus-visible:outline-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Open detection
        </Link>
      </div>
    </Panel>
  );
}
