import { Bell, ChevronDown, Database, Menu, Moon, Search, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { alerts, operator, recentDetections } from "../../data/mission";
import { missionResults } from "../../data/results";
import { locatedTargets } from "../../data/locations";
import { useLiveSession } from "../../context/LiveSessionContext";
import { useUi } from "../../context/UiContext";
import { getHealth, type HealthResponse } from "../../lib/api";
import { cn } from "../../lib/cn";

export function TopBar() {
  const {
    dark,
    toggleDark,
    query,
    setQuery,
    noticesOpen,
    setNoticesOpen,
    markNoticesRead,
    setSidebarOpen,
    setLogoutOpen,
  } = useUi();
  const { liveAlerts, openAlertsCount } = useLiveSession();
  const noticeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null | "loading">("loading");

  useEffect(() => {
    let mounted = true;
    const fetchStatus = () => {
      getHealth()
        .then((res) => { if (mounted) setHealth(res); })
        .catch(() => { if (mounted) setHealth(null); });
    };
    fetchStatus();
    const interval = window.setInterval(fetchStatus, 20000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

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
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setNoticesOpen(false); };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onPointer); window.removeEventListener("keydown", onKey); };
  }, [noticesOpen, setNoticesOpen]);

  useEffect(() => {
    if (!userOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!userRef.current?.contains(event.target as Node)) setUserOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setUserOpen(false); };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onPointer); window.removeEventListener("keydown", onKey); };
  }, [userOpen]);

  /* Connectivity status helpers */
  const backendStatus = health === "loading" ? "loading" : health ? "online" : "offline";
  const dbStatus = health === "loading" ? "loading" : health?.mongodb === "connected" ? "online" : "offline";

  return (
    <header className="sar-topbar sticky top-0 z-30 flex items-center gap-3 px-4 py-3 sm:px-5">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-lg lg:hidden"
        style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border-2)", color: "var(--sar-text-2)" }}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Search */}
      <label className={cn("relative min-w-0 flex-1", onSystem && "hidden")}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
          style={{ color: "var(--sar-text-3)" }}
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => { window.setTimeout(() => setSearchOpen(false), 180); }}
          placeholder={searchPlaceholder}
          className="h-9 w-full rounded-lg pl-9 pr-4 text-sm outline-none"
          style={{
            background: "var(--sar-surface-2)",
            border: "1px solid var(--sar-border)",
            color: "var(--sar-text-1)",
          }}
        />
        {searchOpen && needle && (
          <div
            className="absolute left-0 right-0 top-10 z-40 overflow-hidden rounded-xl"
            style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border-2)", boxShadow: "var(--shadow-popup)" }}
          >
            {searchHits.length === 0 ? (
              <div className="px-4 py-3 text-sm" style={{ color: "var(--sar-text-2)" }}>
                No matches.
                <button type="button" className="ml-2 font-medium" style={{ color: "var(--sar-teal)" }} onMouseDown={() => setQuery("")}>
                  Clear
                </button>
              </div>
            ) : (
              searchHits.map((hit) => (
                <button
                  key={`${hit.to}-${hit.id}`}
                  type="button"
                  onMouseDown={() => { setQuery(""); setSearchOpen(false); navigate(hit.to); }}
                  className="flex w-full flex-col px-4 py-2 text-left"
                  style={{ borderBottom: "1px solid var(--sar-border)" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-surface-hover)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "")}
                >
                  <span className="text-sm font-medium" style={{ color: "var(--sar-text-1)" }}>{hit.label}</span>
                  <span className="text-xs" style={{ color: "var(--sar-text-2)" }}>{hit.detail}</span>
                </button>
              ))
            )}
          </div>
        )}
      </label>

      <div className={cn("flex shrink-0 items-center gap-2 sm:gap-3", onSystem && "ml-auto")}>
        {/* Theme toggle */}
        <div className="flex items-center gap-1.5">
          {dark ? (
            <Moon className="hidden h-3.5 w-3.5 sm:block" style={{ color: "var(--sar-text-3)" }} aria-hidden="true" />
          ) : (
            <Sun className="hidden h-3.5 w-3.5 sm:block" style={{ color: "var(--sar-amber)" }} aria-hidden="true" />
          )}
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleDark}
            className="relative h-5 w-9 rounded-full"
            style={{ background: dark ? "var(--sar-teal)" : "var(--sar-surface-3)" }}
          >
            <span
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
              style={{ left: dark ? "18px" : "2px", transition: "left 0.2s ease" }}
            />
          </button>
        </div>

        {/* Connectivity indicators */}
        {onSystem ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={cn("conn-dot", backendStatus === "loading" ? "unknown" : backendStatus)} />
            <span style={{ color: backendStatus === "online" ? "var(--sar-green)" : backendStatus === "loading" ? "var(--sar-amber)" : "var(--sar-red)" }}>
              FastAPI {backendStatus === "loading" ? "Checking…" : backendStatus === "online" ? "Online" : "Offline"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div
              className="badge-base flex items-center gap-1.5"
              style={{
                background: backendStatus === "online" ? "var(--sar-green-dim)" : backendStatus === "loading" ? "var(--sar-amber-dim)" : "var(--sar-red-dim)",
                color: backendStatus === "online" ? "var(--sar-green)" : backendStatus === "loading" ? "var(--sar-amber)" : "var(--sar-red)",
                border: `1px solid ${backendStatus === "online" ? "rgba(34,197,94,0.25)" : backendStatus === "loading" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}
            >
              <span className={cn("conn-dot", backendStatus === "loading" ? "unknown" : backendStatus)} />
              <span className="hidden sm:inline">
                {backendStatus === "loading" ? "Checking…" : backendStatus === "online" ? "Backend Online" : "Backend Offline"}
              </span>
              <span className="sm:hidden">
                {backendStatus === "loading" ? "…" : backendStatus === "online" ? "API" : "Offline"}
              </span>
            </div>
            <div
              className="badge-base hidden items-center gap-1.5 lg:flex"
              style={{
                background: dbStatus === "online" ? "var(--sar-green-dim)" : dbStatus === "loading" ? "var(--sar-amber-dim)" : "var(--sar-amber-dim)",
                color: dbStatus === "online" ? "var(--sar-green)" : "var(--sar-amber)",
                border: `1px solid ${dbStatus === "online" ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
              }}
            >
              <Database className="h-3 w-3" aria-hidden="true" />
              <span>
                {dbStatus === "loading" ? "DB Checking…" : dbStatus === "online" ? "MongoDB Atlas" : "DB Unavailable"}
              </span>
            </div>
          </div>
        )}

        {/* Notification bell */}
        {!onSystem && (
          <div className="relative" ref={noticeRef}>
            <button
              type="button"
              aria-label={openAlertsCount === 0 ? "Alerts" : `Alerts, ${openAlertsCount} open`}
              aria-expanded={noticesOpen}
              onClick={() => setNoticesOpen(!noticesOpen)}
              className="relative grid h-9 w-9 place-items-center rounded-lg"
              style={{ background: noticesOpen ? "var(--sar-surface-2)" : "" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-surface-2)")}
              onMouseOut={(e) => { if (!noticesOpen) e.currentTarget.style.background = ""; }}
            >
              <Bell className="h-4 w-4" style={{ color: "var(--sar-text-2)" }} />
              {openAlertsCount > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full px-0.5 text-[9px] font-bold text-white"
                  style={{ background: "var(--sar-red)" }}
                  aria-hidden="true"
                >
                  {openAlertsCount}
                </span>
              )}
            </button>
            {noticesOpen && (
              <div
                className="absolute right-0 top-11 w-72 rounded-xl p-2"
                style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border-2)", boxShadow: "var(--shadow-popup)" }}
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--sar-text-3)" }}>
                    Active alerts ({openAlertsCount})
                  </span>
                  <button type="button" onClick={markNoticesRead} className="text-xs font-medium" style={{ color: "var(--sar-teal)" }}>
                    Close
                  </button>
                </div>
                {liveAlerts.length === 0 ? (
                  <p className="px-2 py-3 text-xs" style={{ color: "var(--sar-text-3)" }}>
                    No live alerts yet.
                  </p>
                ) : (
                  liveAlerts.slice(0, 6).map((alert) => (
                    <button
                      key={alert.alert_id}
                      type="button"
                      onClick={() => { setNoticesOpen(false); navigate(`/alerts/${alert.alert_id}`); }}
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left"
                      onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-surface-hover)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "")}
                    >
                      <span
                        className="badge-base mt-0.5"
                        style={{
                          background: alert.priority === "High" ? "var(--sar-red-dim)" : "var(--sar-amber-dim)",
                          color: alert.priority === "High" ? "var(--sar-red)" : "var(--sar-amber)",
                          border: `1px solid ${alert.priority === "High" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
                        }}
                      >
                        {alert.priority.toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold" style={{ color: "var(--sar-text-1)" }}>
                          {alert.headline}
                        </span>
                        <span className="block truncate text-[10px]" style={{ color: "var(--sar-text-3)" }}>
                          {Math.round(alert.confidence * 100)}% · Frame #{alert.frame_number}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2"
            aria-expanded={userOpen}
            aria-label="Account menu"
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-surface-2)")}
            onMouseOut={(e) => { if (!userOpen) e.currentTarget.style.background = ""; }}
          >
            <span
              className="grid h-7 w-7 place-items-center rounded-full"
              style={{ background: "var(--sar-teal-dim)", color: "var(--sar-teal)" }}
            >
              <User className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="hidden text-xs font-medium sm:inline" style={{ color: "var(--sar-text-2)" }}>
              {operator.role}
            </span>
            <ChevronDown className="h-3.5 w-3.5" style={{ color: "var(--sar-text-3)" }} aria-hidden="true" />
          </button>
          {userOpen && (
            <div
              className="absolute right-0 top-10 w-40 rounded-xl p-1.5"
              style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border-2)", boxShadow: "var(--shadow-popup)" }}
            >
              <div className="px-2.5 py-1.5 text-xs font-semibold" style={{ color: "var(--sar-text-1)" }}>{operator.role}</div>
              <button
                type="button"
                onClick={() => { setUserOpen(false); setLogoutOpen(true); }}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs"
                style={{ color: "var(--sar-red)" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-red-dim)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "")}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
