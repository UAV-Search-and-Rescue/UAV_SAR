import { Sun } from "lucide-react";
import { weather } from "../../data/mission";

export function MissionHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">
          Mission Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Monitor search and rescue operations with UAV detection
        </p>
      </div>

      <div className="flex items-center gap-4 self-start rounded-2xl border border-[#e6edf5] bg-white px-4 py-3 shadow-[0_8px_24px_rgb(15_23_42/0.04)] dark:border-slate-800 dark:bg-slate-900 sm:self-auto">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-50">
          <Sun className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <div className="text-lg font-bold leading-none text-slate-900 dark:text-white">
            {weather.temp}
          </div>
          <div className="mt-1 text-xs text-slate-400">{weather.place}</div>
        </div>
        <div className="border-l border-slate-100 pl-4 text-right dark:border-slate-800">
          <div className="text-xs text-slate-400">{weather.date}</div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {weather.time}
          </div>
        </div>
      </div>
    </div>
  );
}
