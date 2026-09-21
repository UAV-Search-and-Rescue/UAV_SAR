import type { ReactNode } from 'react'
import { Camera, Flame, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import {
  GRID_COLUMNS,
  alerts,
  gridCellForFrame,
} from '../data/mockData'
import { useMissionPlayback } from '../context/MissionPlaybackContext'
import { GlassPanel } from './ui/GlassPanel'
import { HudHeading } from './ui/HudHeading'
import { StatusBadge } from './ui/StatusBadge'

const ALERT_FRAMES = new Set(alerts.map((alert) => alert.rgbFrameId))

export function MissionControl() {
  const {
    catalog,
    recordingId,
    recording,
    rgbFrameId,
    thermalFrameId,
    gridCell,
    split,
    playing,
    selectRecording,
    setRgbFrameId,
    togglePlayback,
  } = useMissionPlayback()

  const emptyFrames = new Set(recording.rgbEmptyFrames)
  const cells = Array.from({ length: recording.pairedFrameCount }, (_, frame) => frame)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <GlassPanel as="label" className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Recording
          </span>
          <select
            value={recordingId}
            onChange={(event) => selectRecording(event.target.value)}
            className="mt-2 w-full rounded-md border border-cyan-900/50 bg-slate-950/70 px-3 py-2 font-mono text-sm text-cyan-100 outline-none transition-all duration-300 focus:border-cyan-400/60 focus:shadow-[0_0_16px_rgba(56,189,248,0.25)]"
          >
            {catalog.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
          <p className="telemetry mt-2 text-xs opacity-80">
            {recording.collectionContext}
          </p>
        </GlassPanel>
        <Meta label="Partition" value={recording.partition} detail="frozen development" />
        <Meta
          label="Frame counts"
          value={`${recording.rgb.frameCount} / ${recording.thermal.frameCount}`}
          detail={`RGB ${recording.rgb.firstFrameId}–${recording.rgb.lastFrameId} · IR ${recording.thermal.firstFrameId}–${recording.thermal.lastFrameId}`}
        />
        <Meta
          label="Active modalities"
          value="RGB + Thermal"
          detail={recording.pairingRule}
          accent="orange"
        />
      </section>

      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <HudHeading>Simulated tactical grid</HudHeading>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              No GPS in WiSARD. Cell index is the RGB frame id. Active cell:{' '}
              <span className="telemetry telemetry-hot">{gridCell}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              label="Previous frame"
              onClick={() => setRgbFrameId(rgbFrameId - 1)}
            >
              <SkipBack className="h-4 w-4" />
            </IconButton>
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-300/30 bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(56,189,248,0.65)]"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <IconButton
              label="Next frame"
              onClick={() => setRgbFrameId(rgbFrameId + 1)}
            >
              <SkipForward className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <TickerStat
            icon={<Camera className="h-3.5 w-3.5 text-cyan-400" />}
            label="RGB frame"
            value={String(rgbFrameId)}
            frameKey={rgbFrameId}
          />
          <TickerStat
            icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
            label="Thermal frame"
            value={String(thermalFrameId)}
            frameKey={thermalFrameId}
            accent="orange"
          />
          <TickerStat label="Chronological split" value={split} />
        </div>

        <input
          type="range"
          min={recording.rgb.firstFrameId}
          max={recording.rgb.lastFrameId}
          value={rgbFrameId}
          onChange={(event) => setRgbFrameId(Number(event.target.value))}
          className="holo-slider mt-4"
          aria-label="RGB frame"
        />

        <div
          className="mt-4 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
        >
          {cells.map((frameId) => {
            const isActive = frameId === rgbFrameId
            const isEmpty = emptyFrames.has(frameId)
            const hasAlert = ALERT_FRAMES.has(frameId)
            return (
              <button
                key={frameId}
                type="button"
                title={`${gridCellForFrame(frameId)} · RGB ${frameId} / IR ${frameId + recording.frameOffset}`}
                onClick={() => setRgbFrameId(frameId)}
                className={[
                  'aspect-square rounded-sm border transition-all duration-300',
                  isActive
                    ? 'grid-cell-active border-cyan-300 bg-cyan-400/90'
                    : isEmpty
                      ? 'border-orange-400/70 bg-orange-500/30 hover:border-orange-300/80 hover:shadow-[0_0_10px_rgba(249,115,22,0.45)]'
                      : hasAlert
                        ? 'border-cyan-400/70 bg-cyan-500/25 hover:border-cyan-300/80 hover:shadow-[0_0_10px_rgba(56,189,248,0.45)]'
                        : 'border-cyan-900/50 bg-slate-950/70 hover:border-cyan-400/50 hover:shadow-[0_0_8px_rgba(56,189,248,0.3)]',
                ].join(' ')}
              />
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
          <StatusBadge tone="cyan">Active UAV cell</StatusBadge>
          <StatusBadge tone="cyan">Alert frame</StatusBadge>
          <StatusBadge tone="orange">FP probe 202–204</StatusBadge>
        </div>
      </GlassPanel>
    </div>
  )
}

function Meta({
  label,
  value,
  detail,
  accent = 'cyan',
}: {
  label: string
  value: string
  detail: string
  accent?: 'cyan' | 'orange'
}) {
  return (
    <GlassPanel as="article" accent={accent} className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-medium capitalize ${
          accent === 'orange' ? 'telemetry telemetry-orange' : 'telemetry'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 font-mono text-xs text-slate-400">{detail}</p>
    </GlassPanel>
  )
}

function TickerStat({
  icon,
  label,
  value,
  frameKey,
  accent = 'cyan',
}: {
  icon?: ReactNode
  label: string
  value: string
  frameKey?: number
  accent?: 'cyan' | 'orange'
}) {
  return (
    <div className="rounded-md border border-cyan-900/40 bg-slate-950/60 px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p
        key={frameKey}
        className={`mt-1 text-sm frame-enter telemetry-hot ${
          accent === 'orange' ? 'telemetry telemetry-orange' : 'telemetry'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-md border border-cyan-500/30 bg-slate-950/70 p-2 text-cyan-100 shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-[0_0_18px_rgba(56,189,248,0.35)]"
    >
      {children}
    </button>
  )
}
