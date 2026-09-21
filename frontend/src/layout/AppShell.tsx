import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Crosshair } from 'lucide-react'
import { useMissionPlayback } from '../context/MissionPlaybackContext'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TacticalField } from '../components/ui/TacticalField'
import { NAV_ITEMS } from './nav'

function currentItem(pathname: string) {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.to)) ?? NAV_ITEMS[0]
}

export function AppShell() {
  const { pathname } = useLocation()
  const active = currentItem(pathname)
  const { recording, rgbFrameId, thermalFrameId, gridCell, playing } = useMissionPlayback()

  return (
    <div className="relative flex min-h-svh bg-tactical text-slate-200">
      <TacticalField />

      <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-cyan-400/35 bg-slate-950/50 shadow-[8px_0_40px_rgba(56,189,248,0.08)] backdrop-blur-2xl md:flex">
        <div className="border-b border-cyan-900/40 px-5 py-5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
            <Crosshair className="h-3.5 w-3.5" />
            UAV SAR
          </p>
          <h1 className="mt-2 text-lg font-semibold text-white">Operator Shell</h1>
          <p className="mt-1 text-xs text-slate-400">RGB + thermal replay</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2.5 transition-all duration-300',
                    isActive
                      ? 'border border-cyan-400/40 bg-cyan-500/10 text-white shadow-[0_0_18px_rgba(56,189,248,0.18)]'
                      : 'border border-transparent text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-slate-100',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <span className="flex items-start gap-3">
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isActive
                          ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                          : 'text-slate-500'
                      }`}
                    />
                    <span>
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-slate-500">{item.hint}</span>
                    </span>
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className="border-t border-cyan-900/40 px-5 py-4 text-xs text-slate-500">
          <p className="telemetry text-xs">{recording.collectionContext}</p>
          <p className="mt-1">Replay only · no live UAV link</p>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 border-b border-cyan-400/25 bg-slate-950/50 px-4 py-3 backdrop-blur-2xl md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
              {active.hint}
            </p>
            <h2 className="hud-heading mt-1 text-base font-semibold text-white md:text-lg">
              {active.label}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge tone={playing ? 'green' : 'cyan'}>
              <span
                className={`pulse-dot h-1.5 w-1.5 rounded-full ${
                  playing ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
              />
              {playing ? 'Replay active' : 'Standby'}
            </StatusBadge>
            <StatusBadge tone="cyan">
              RGB {recording.rgb.width}×{recording.rgb.height}
            </StatusBadge>
            <StatusBadge tone="orange">
              IR {recording.thermal.width}×{recording.thermal.height}
            </StatusBadge>
            <StatusBadge tone="slate">
              <span className="telemetry telemetry-hot">RGB {rgbFrameId}</span>
              <span className="text-slate-500">/</span>
              <span className="telemetry telemetry-orange telemetry-hot">IR {thermalFrameId}</span>
              <span className="text-slate-500">·</span>
              <span className="telemetry telemetry-hot">{gridCell}</span>
            </StatusBadge>
          </div>
        </header>

        <nav
          className="flex gap-1 overflow-x-auto border-b border-cyan-400/25 bg-tactical/70 px-2 py-2 backdrop-blur-2xl md:hidden"
          aria-label="Primary mobile"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-300',
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                      : 'text-slate-400',
                  ].join(' ')
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <main className="holo-stage min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
