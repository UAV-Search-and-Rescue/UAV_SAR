import { Bell, ChevronDown, Database, Menu, Moon, Search, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { alerts, operator, recentDetections } from "../../data/mission";
import { missionResults } from "../../data/results";
import { locatedTargets } from "../../data/locations";
import { useUi } from "../../context/UiContext";
import { cn } from "../../lib/cn";

export function TopBar() {
  const {
    dark,
    toggleDark,
    query,
    setQuery,
    noticesOpen,
    setNoticesOpen,
    noticesRead,
    markNoticesRead,
    setSidebarOpen,
    setLogoutOpen,
  } = useUi();
  const noticeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onSystem = pathname.startsWith("/system");
  const needle = query.trim().toLowerCase();
  const searchHits = needle
    ? [
        ...recentDetections
          .filter((item) => `${item.id} ${item.location} ${item.score}`.toLowerCase().includes(needle))
          .map((item) => ({ id: item.id, label: item.id, detail: item.location, to: `/results/R024?score=${item.score}` })),
        ...missionResults
          .filter((item) => `${item.id} ${item.location} ${item.model}`.toLowerCase().includes(needle))
          .slice(0, 4)
          .map((item) => ({ id: item.id, label: `#${item.id}`, detail: `${item.model} · ${item.location}`, to: `/results/${item.id}` })),
        ...alerts
          .filter((item) => `${item.severity} ${item.location} ${item.confidence}`.toLowerCase().includes(needle))
          .map((item) => ({ id: item.id, label: `Alert ${item.severity}`, detail: item.location, to: `/alerts/${item.id}` })),
        ...locatedTargets
          .filter((item) => `${item.id} ${item.latitude} ${item.longitude} ${item.locationType}`.toLowerCase().includes(needle))
          .slice(0, 4)
          .map((item) => ({ id: item.id, label: item.id, detail: item.locationType, to: `/localization/${item.id}` })),
      ].slice(0, 8)
    : [];
  const searchPlaceholder = pathname.startsWith("/results")
    ? "Search by ID, date, model, location..."
    : pathname.startsWith("/detection")
      ? "Search detections, results, alerts..."
      : pathname.startsWith("/alerts")
        ? "Search alerts, locations..."
        : pathname.startsWith("/localization")
          ? "Search locations, detections, coordinates..."
          : "Search detections, locations...";

  useEffect(() => {
    if (!noticesOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!noticeRef.current?.contains(event.target as Node)) setNoticesOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNoticesOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [noticesOpen, setNoticesOpen]);

  useEffect(() => {
    if (!userOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!userRef.current?.contains(event.target as Node)) setUserOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [userOpen]);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-[#f3f6fb]/95 px-4 py-4 backdrop-blur dark:bg-[#0b1220]/95 sm:px-5">
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <label className={cn("relative min-w-0 flex-1", onSystem && "hidden")}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setSearchOpen(false), 180);
          }}
          placeholder={searchPlaceholder}
          className="h-11 w-full rounded-full border border-[#e6edf5] bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900"
        />
        {searchOpen && needle && (
          <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-2xl border border-[#e6edf5] bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {searchHits.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">
                No matches.
                <button type="button" className="ml-2 font-medium text-blue-600" onMouseDown={() => setQuery("")}>
                  Reset search
                </button>
              </div>
            ) : (
              searchHits.map((hit) => (
                <button
                  key={`${hit.to}-${hit.id}`}
                  type="button"
                  onMouseDown={() => {
                    setQuery("");
                    setSearchOpen(false);
                    navigate(hit.to);
                  }}
                  className="flex w-full flex-col px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{hit.label}</span>
                  <span className="text-xs text-slate-400">{hit.detail}</span>
                </button>
              ))
            )}
          </div>
        )}
      </label>

      <div className={cn("flex shrink-0 items-center gap-3 sm:gap-4", onSystem && "ml-auto")}>
        <div className="flex items-center gap-2">
          {dark ? (
            <Moon className="hidden h-4 w-4 text-slate-300 sm:block" />
          ) : (
            <Sun className="hidden h-4 w-4 text-amber-400 sm:block" />
          )}
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleDark}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              dark ? "bg-blue-600" : "bg-slate-200",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                dark ? "left-[18px]" : "left-0.5",
              )}
            />
          </button>
        </div>

        {onSystem ? (
          <div className="hidden items-center gap-1.5 text-xs font-medium text-emerald-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            All Systems Operational
          </div>
        ) : (
          <>
            <div className="hidden items-center gap-1.5 text-xs font-medium text-emerald-500 xl:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Backend Connected
            </div>
            <div className="hidden items-center gap-1.5 text-xs font-medium text-emerald-500 xl:flex">
              <Database className="h-3.5 w-3.5" />
              MongoDB Atlas
            </div>
          </>
        )}

        {!onSystem && (
          <div className="relative" ref={noticeRef}>
            <button
              type="button"
              aria-label={noticesRead ? "Alerts" : "Alerts, 3 unread"}
              onClick={() => setNoticesOpen(!noticesOpen)}
              className="relative grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-white dark:hover:bg-slate-900"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className={cn("absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white", noticesRead && "hidden")}>
                3
              </span>
            </button>
            {noticesOpen && (
              <div className="absolute right-0 top-12 w-72 rounded-2xl border border-[#e6edf5] bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active alerts</span>
                <button type="button" onClick={markNoticesRead} className="text-xs font-medium text-blue-600">
                  Mark all as read
                </button>
              </div>
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => {
                      setNoticesOpen(false);
                      navigate(`/alerts/${alert.id}`);
                    }}
                    className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span
                      className={cn(
                        "mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white",
                        alert.severity === "HIGH" ? "bg-red-500" : "bg-amber-400",
                      )}
                    >
                      {alert.severity}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                        Person Detected
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {alert.confidence} · {alert.location}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {onSystem ? (
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-white dark:hover:bg-slate-900"
              aria-expanded={userOpen}
              aria-label="Account menu"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-white">
                <User className="h-4 w-4" />
              </span>
              <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-slate-100">
                {operator.role}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-12 w-44 rounded-2xl border border-[#e6edf5] bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="px-2 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">{operator.role}</div>
                <button
                  type="button"
                  onClick={() => {
                    setUserOpen(false);
                    setLogoutOpen(true);
                  }}
                  className="w-full rounded-xl px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-white"
            aria-label={operator.role}
          >
            <User className="h-4 w-4" />
          </div>
        )}
      </div>
    </header>
  );
}
