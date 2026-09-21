import { useMemo, useState } from 'react'
import { AlertTriangle, Camera, Check, Flag, MapPin, X } from 'lucide-react'
import {
  alerts as seedAlerts,
  type AlertLog,
  type AlertReviewStatus,
} from '../data/mockData'
import { useMissionPlayback } from '../context/MissionPlaybackContext'
import { GlassPanel } from './ui/GlassPanel'
import { HudHeading } from './ui/HudHeading'
import { StatusBadge } from './ui/StatusBadge'

const ACTIONS: Array<{
  status: Exclude<AlertReviewStatus, 'open'>
  label: string
  icon: typeof Check
}> = [
  { status: 'accepted', label: 'Accept', icon: Check },
  { status: 'dismissed', label: 'Dismiss', icon: X },
  { status: 'escalated', label: 'Escalate', icon: Flag },
]

export function AlertsCenter() {
  const { rgbFrameId, setRgbFrameId, pause } = useMissionPlayback()
  const [queue, setQueue] = useState<AlertLog[]>(() => seedAlerts.map((alert) => ({ ...alert })))

  const stats = useMemo(() => {
    return {
      open: queue.filter((alert) => alert.reviewStatus === 'open').length,
      probes: queue.filter((alert) => alert.kind === 'false_positive_probe').length,
      escalated: queue.filter((alert) => alert.reviewStatus === 'escalated').length,
    }
  }, [queue])

  function review(id: string, status: AlertReviewStatus) {
    setQueue((current) =>
      current.map((alert) => (alert.id === id ? { ...alert, reviewStatus: status } : alert)),
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Summary label="Queue" value={String(queue.length)} />
        <Summary label="Open" value={String(stats.open)} />
        <Summary label="FP probes 202–204" value={String(stats.probes)} accent="orange" />
        <Summary label="Escalated" value={String(stats.escalated)} />
      </div>

      <GlassPanel className="p-5">
        <HudHeading>Rescue alert & target center</HudHeading>
        <p className="mt-2 text-sm text-slate-400">
          Human-in-the-loop review. Actions stay in the UI and are not written
          back to WiSARD. Probe cards are empty validation frames used to catch
          invented people.
        </p>
        <ul className="mt-4 grid gap-3">
          {queue.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              active={alert.rgbFrameId === rgbFrameId}
              onReview={review}
              onFocusFrame={() => {
                pause()
                setRgbFrameId(alert.rgbFrameId)
              }}
            />
          ))}
        </ul>
      </GlassPanel>
    </div>
  )
}

function Summary({
  label,
  value,
  accent = 'cyan',
}: {
  label: string
  value: string
  accent?: 'cyan' | 'orange'
}) {
  return (
    <GlassPanel as="article" accent={accent} className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          accent === 'orange' ? 'telemetry telemetry-orange' : 'telemetry'
        }`}
      >
        {value}
      </p>
    </GlassPanel>
  )
}

function AlertCard({
  alert,
  active,
  onReview,
  onFocusFrame,
}: {
  alert: AlertLog
  active: boolean
  onReview: (id: string, status: AlertReviewStatus) => void
  onFocusFrame: () => void
}) {
  const probe = alert.kind === 'false_positive_probe'

  return (
    <GlassPanel
      as="li"
      lift={false}
      accent={probe ? 'orange' : 'cyan'}
      className={['px-4 py-3', active ? 'border-cyan-400/50 shadow-[0_0_22px_rgba(56,189,248,0.2)]' : ''].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
          {probe ? (
            <AlertTriangle className="h-4 w-4 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          ) : (
            <Camera className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
          )}
          class {alert.box.className}
          <span className="telemetry text-xs">conf {alert.confidence.toFixed(2)}</span>
          {probe ? <StatusBadge tone="orange">Test case · FP probe</StatusBadge> : null}
          <StatusBadge tone={alert.reviewStatus === 'escalated' ? 'orange' : 'slate'}>
            {alert.reviewStatus}
          </StatusBadge>
        </p>
        <button
          type="button"
          onClick={onFocusFrame}
          className="telemetry inline-flex items-center gap-1 text-xs transition-all duration-300 hover:text-cyan-200"
        >
          <MapPin className="h-3.5 w-3.5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          {alert.simulatedGridCell}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-300">{alert.summary}</p>
      <p className="mt-1 font-mono text-xs text-slate-500">
        RGB frame <span className="telemetry text-xs">{alert.rgbFrameId}</span> · IR{' '}
        <span className="telemetry telemetry-orange text-xs">{alert.thermalFrameId}</span> · GT
        objects {alert.groundTruthObjectCount} · {alert.split}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          const selected = alert.reviewStatus === action.status
          const escalate = action.status === 'escalated'
          return (
            <button
              key={action.status}
              type="button"
              onClick={() => onReview(alert.id, action.status)}
              className={[
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all duration-300',
                selected
                  ? escalate
                    ? 'border-orange-400/50 bg-gradient-to-r from-orange-400 to-red-600 text-slate-950 shadow-[0_0_16px_rgba(249,115,22,0.45)]'
                    : 'border-cyan-300/40 bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_16px_rgba(56,189,248,0.45)]'
                  : 'border-cyan-900/50 text-slate-300 hover:border-cyan-400/50 hover:bg-cyan-500/5',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </button>
          )
        })}
      </div>
    </GlassPanel>
  )
}
