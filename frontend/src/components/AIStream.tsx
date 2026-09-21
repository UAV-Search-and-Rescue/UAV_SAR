import { useMemo, useState, type ReactNode } from 'react'
import { Camera, Flame, Info } from 'lucide-react'
import {
  alignment,
  boxToPercentOverlay,
  groundTruthForRgbFrame,
  type DetectionBox,
} from '../data/mockData'
import { useMissionPlayback } from '../context/MissionPlaybackContext'
import { GlassPanel } from './ui/GlassPanel'
import { HudHeading } from './ui/HudHeading'
import { StatusBadge } from './ui/StatusBadge'

export function AIStream() {
  const { recording, rgbFrameId, thermalFrameId, gridCell } = useMissionPlayback()
  const [showGroundTruth, setShowGroundTruth] = useState(true)
  const gt = groundTruthForRgbFrame(rgbFrameId)
  const rgbBoxes = useMemo(
    () => (showGroundTruth ? (gt?.rgbBoxes ?? []) : []),
    [gt, showGroundTruth],
  )
  const thermalBoxes = useMemo(
    () => (showGroundTruth ? (gt?.thermalBoxes ?? []) : []),
    [gt, showGroundTruth],
  )
  const affine = alignment.fits.find((fit) => fit.name === 'affine_ransac')
  const homography = alignment.fits.find((fit) => fit.name === 'homography_ransac')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-slate-400">
          RGB{' '}
          <span className="telemetry">
            {recording.rgb.width}×{recording.rgb.height}
          </span>{' '}
          and thermal{' '}
          <span className="telemetry telemetry-orange">
            {recording.thermal.width}×{recording.thermal.height}
          </span>{' '}
          stay letterboxed and locked by{' '}
          <span className="font-mono text-cyan-200/80">{recording.pairingRule}</span>. Current pair:{' '}
          <span className="telemetry telemetry-hot">RGB {rgbFrameId}</span>
          {' / '}
          <span className="telemetry telemetry-orange telemetry-hot">IR {thermalFrameId}</span>
          {' · '}
          <span className="telemetry telemetry-hot">{gridCell}</span>.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-cyan-500/30 bg-slate-950/90 px-3 py-2 text-sm text-slate-200 shadow-[0_20px_50px_rgba(8,112,184,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/60">
          <input
            type="checkbox"
            checked={showGroundTruth}
            onChange={(event) => setShowGroundTruth(event.target.checked)}
            className="accent-cyan-400"
          />
          Ground-truth boxes
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="cyan">
          Affine {affine?.meanError.toFixed(4)} — comparison baseline
        </StatusBadge>
        <StatusBadge tone="orange">
          Homography unstable — not a default warp
        </StatusBadge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LetterboxPane
          title="RGB stream"
          subtitle={`${recording.rgb.recordingName} · frame ${rgbFrameId}`}
          accent="cyan"
          icon={<Camera className="h-4 w-4" />}
          aspect={recording.rgb.aspectRatio}
          imageWidth={recording.rgb.width}
          imageHeight={recording.rgb.height}
          wash="bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.22),transparent_55%),#05070e]"
          boxes={rgbBoxes}
          emptyMessage={
            showGroundTruth && !gt
              ? 'No mock GT overlay for this frame'
              : showGroundTruth && rgbBoxes.length === 0
                ? 'Empty RGB frame — 0 labeled people'
                : undefined
          }
        />
        <LetterboxPane
          title="Thermal stream"
          subtitle={`${recording.thermal.recordingName} · frame ${thermalFrameId}`}
          accent="thermal"
          icon={<Flame className="h-4 w-4" />}
          aspect={recording.thermal.aspectRatio}
          imageWidth={recording.thermal.width}
          imageHeight={recording.thermal.height}
          wash="bg-[radial-gradient(circle_at_70%_30%,rgba(249,115,22,0.24),transparent_55%),#120805]"
          boxes={thermalBoxes}
          emptyMessage={
            showGroundTruth && thermalBoxes.length === 0 && gt
              ? 'Empty paired thermal labels for this probe frame'
              : undefined
          }
        />
      </div>

      <GlassPanel as="aside" className="p-5">
        <HudHeading>
          <Info className="h-4 w-4 text-cyan-400" />
          Why separate coordinate systems
        </HudHeading>
        <p className="mt-2 text-sm leading-6 text-slate-300">{alignment.rationale}</p>
        <p className="mt-3 font-mono text-xs text-slate-500">
          Affine <span className="telemetry text-xs">{affine?.meanError.toFixed(4)}</span> is the
          best exploratory center-fit. Homography{' '}
          <span className="telemetry telemetry-orange text-xs">
            {homography?.meanError.toFixed(4)}
          </span>{' '}
          looks similar in the pooled table but windowed estimates were extreme. Force-stretch
          overlays stay off.
        </p>
      </GlassPanel>
    </div>
  )
}

function LetterboxPane({
  title,
  subtitle,
  accent,
  icon,
  aspect,
  imageWidth,
  imageHeight,
  wash,
  boxes,
  emptyMessage,
}: {
  title: string
  subtitle: string
  accent: 'cyan' | 'thermal'
  icon: ReactNode
  aspect: number
  imageWidth: number
  imageHeight: number
  wash: string
  boxes: DetectionBox[]
  emptyMessage?: string
}) {
  const isCyan = accent === 'cyan'
  const ring = isCyan
    ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]'
    : 'text-orange-300 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]'

  return (
    <GlassPanel as="article" accent={isCyan ? 'cyan' : 'orange'} className="p-4">
      <HudHeading accent={isCyan ? 'cyan' : 'orange'}>
        <span className={`flex items-center gap-2 ${ring}`}>
          {icon}
          {title}
        </span>
      </HudHeading>
      <p className="mt-1 truncate font-mono text-xs text-slate-500">{subtitle}</p>
      <div
        className={`mt-4 flex min-h-56 items-center justify-center rounded-lg border bg-black/60 p-3 ${
          isCyan ? 'border-cyan-500/30' : 'border-orange-500/30'
        }`}
      >
        <div
          className={`relative w-full overflow-hidden rounded-sm ${wash}`}
          style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
        >
          <div
            className={`scanline-overlay absolute inset-0 z-[1] ${
              isCyan ? '' : 'scanline-overlay-thermal'
            }`}
          />
          <div className="scan-sweep absolute inset-x-0 top-0 z-[2] h-16" />
          <div
            className={`scan-laser absolute inset-x-0 top-0 z-[3] ${
              isCyan ? '' : 'scan-laser-thermal'
            }`}
          />
          {boxes.map((box, index) => (
            <div
              key={`${box.centerX}-${box.centerY}-${index}`}
              className={`absolute z-10 box-border border-2 transition-[left,top,width,height] duration-200 ${
                isCyan ? 'bbox-glow' : 'bbox-glow-thermal'
              }`}
              style={{
                ...boxToPercentOverlay(box, imageWidth, imageHeight),
                borderColor: isCyan ? '#38bdf8' : '#f97316',
                backgroundColor: isCyan
                  ? 'rgba(56, 189, 248, 0.18)'
                  : 'rgba(249, 115, 22, 0.18)',
              }}
            >
              <span
                className="absolute left-0.5 top-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                style={{ color: isCyan ? '#67e8f9' : '#fdba74' }}
              >
                {box.className}
              </span>
            </div>
          ))}
          {emptyMessage ? (
            <p className="absolute inset-x-0 bottom-2 z-10 text-center font-mono text-[11px] text-slate-400">
              {emptyMessage}
            </p>
          ) : null}
        </div>
      </div>
      <p className="telemetry mt-3 text-xs opacity-80">
        {imageWidth}×{imageHeight} · aspect {aspect.toFixed(3)} · {boxes.length} GT boxes
      </p>
    </GlassPanel>
  )
}
