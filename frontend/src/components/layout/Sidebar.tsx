import {
  Bell,
  ClipboardList,
  Home,
  LogOut,
  MapPinned,
  Scan,
  Settings,
  User,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { operator } from "../../data/mission";
import { useUi } from "../../context/UiContext";
import { cn } from "../../lib/cn";
import { UavMark } from "../icons";

const items = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/detection", label: "Detection", icon: Scan },
  { to: "/results", label: "Results", icon: ClipboardList },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/localization", label: "Localization", icon: MapPinned },
  { to: "/system", label: "System", icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, setLogoutOpen } = useUi();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[240px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <UavMark className="h-9 w-9 text-blue-500" />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
            UAV SAR
          </div>
          <div className="text-[11px] text-slate-400">Search &amp; Rescue</div>
        </div>
      </div>
      <div className="px-5 pb-4">
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Sample interface
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "border-blue-600 bg-[#e8f1ff] font-semibold text-blue-600 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-300"
                    : "border-transparent font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isActive ? "text-blue-600 dark:text-blue-300" : "text-slate-400",
                    )}
                    strokeWidth={2}
                  />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#eef2f7] px-4 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-white">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {operator.role}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
