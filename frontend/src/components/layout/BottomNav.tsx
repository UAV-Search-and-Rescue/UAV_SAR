import { Bell, ClipboardList, Home, MapPinned, Scan } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useLiveSession } from "../../context/LiveSessionContext";
import { cn } from "../../lib/cn";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/detection", label: "Detect", icon: Scan },
  { to: "/alerts", label: "Alerts", icon: Bell, hasAlertBadge: true },
  { to: "/localization", label: "Locate", icon: MapPinned },
  { to: "/results", label: "Results", icon: ClipboardList },
];

export function BottomNav() {
  const { openAlertsCount } = useLiveSession();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200/80 bg-white/95 px-2 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-all",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium",
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <span
                    className={cn(
                      "grid h-8 w-11 place-items-center rounded-full transition-colors",
                      isActive
                        ? "bg-blue-100/70 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {item.hasAlertBadge && openAlertsCount > 0 && (
                    <span className="absolute -right-1 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {openAlertsCount}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 text-[11px] leading-tight tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
