import {
  Bell,
  ClipboardList,
  Home,
  LogOut,
  MapPinned,
  Scan,
  User,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { operator } from "../../data/mission";
import { useLiveSession } from "../../context/LiveSessionContext";
import { useUi } from "../../context/UiContext";
import { cn } from "../../lib/cn";
import { UavMark } from "../icons";

const items = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/detection", label: "Detection", icon: Scan },
  { to: "/results", label: "Results", icon: ClipboardList },
  { to: "/alerts", label: "Alerts", icon: Bell, hasAlertBadge: true },
  { to: "/localization", label: "Localization", icon: MapPinned },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, setLogoutOpen } = useUi();
  const { openAlertsCount } = useLiveSession();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[220px] shrink-0 flex-col lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}
      style={{
        background: "var(--sar-surface)",
        borderRight: "1px solid var(--sar-border)",
        transition: "transform 0.25s ease",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4" style={{ borderBottom: "1px solid var(--sar-border)" }}>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: "var(--sar-teal-dim)" }}>
          <UavMark className="h-5 w-5" style={{ color: "var(--sar-teal)" }} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight" style={{ color: "var(--sar-text-1)" }}>UAV SAR</div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--sar-teal)" }}>Search &amp; Rescue</div>
        </div>
      </div>

      {/* Nav section label */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--sar-text-3)" }}>
          Navigation
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1" aria-label="Primary navigation">
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
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive ? "nav-active" : "nav-inactive",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="h-[16px] w-[16px] shrink-0"
                    style={{ color: isActive ? "var(--sar-teal)" : "var(--sar-text-3)" }}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.hasAlertBadge && openAlertsCount > 0 && (
                    <span
                      className="badge-base badge-red"
                      aria-label={`${openAlertsCount} unread alerts`}
                    >
                      {openAlertsCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Operator area */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--sar-border)" }}>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2" style={{ background: "var(--sar-surface-2)" }}>
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--sar-teal-dim)", color: "var(--sar-teal)" }}
            aria-hidden="true"
          >
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold" style={{ color: "var(--sar-text-1)" }}>
              {operator.role}
            </div>
            <div className="text-[10px]" style={{ color: "var(--sar-text-3)" }}>Active session</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium nav-inactive"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
