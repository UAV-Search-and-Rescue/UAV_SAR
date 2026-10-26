import { List, CircleHelp } from "lucide-react";
import { Link } from "react-router-dom";
import { CardHeader, Panel } from "../ui";

export function RecentDetections() {
  return (
    <Panel>
      <CardHeader icon={<List className="h-4 w-4 text-slate-500" />} title="Recent detections">
        <Link
          to="/results"
          className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
        >
          View results
        </Link>
      </CardHeader>
      <div className="mx-4 mb-4 flex min-h-20 items-center gap-3 rounded-lg bg-[var(--color-background)] px-4 py-3">
        <CircleHelp className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">No detection data available</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">The results API is not configured.</p>
        </div>
      </div>
    </Panel>
  );
}
