import { alignment, evaluationRuns, type EvaluationRun } from '../data/mockData'
import { GlassPanel } from './ui/GlassPanel'
import { HudHeading } from './ui/HudHeading'
import { StatusBadge } from './ui/StatusBadge'

function metricCell(
  run: EvaluationRun,
  key: keyof NonNullable<EvaluationRun['metrics']>,
) {
  if (run.status === 'not_run' || run.metrics === null) {
    return 'Not Run'
  }
  return run.metrics[key].toFixed(1)
}

export function ModelEvaluation() {
  const identity = alignment.fits.find((fit) => fit.name === 'no_transform')
  const affine = alignment.fits.find((fit) => fit.name === 'affine_ransac')
  const homography = alignment.fits.find((fit) => fit.name === 'homography_ransac')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <GlassPanel className="p-5">
        <HudHeading>Detector comparison</HudHeading>
        <p className="mt-2 text-sm text-slate-400">
          These columns are object-detection scores (Precision, Recall, F1, mAP).
          They are not alignment residuals.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Run</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Model</th>
                <th className="py-2 pr-4 font-medium">Precision</th>
                <th className="py-2 pr-4 font-medium">Recall</th>
                <th className="py-2 pr-4 font-medium">F1</th>
                <th className="py-2 pr-4 font-medium">mAP50</th>
                <th className="py-2 font-medium">mAP50-95</th>
              </tr>
            </thead>
            <tbody>
              {evaluationRuns.map((run) => (
                <tr key={run.id} className="border-t border-cyan-900/40">
                  <td className="py-3 pr-4 text-white">{run.label}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge tone={run.status === 'not_run' ? 'orange' : 'cyan'}>
                      {run.status === 'not_run' ? 'Not Run' : '1-epoch smoke'}
                    </StatusBadge>
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-400">
                    {run.model ?? '—'}
                  </td>
                  <td className="py-3 pr-4 telemetry text-sm">{metricCell(run, 'precision')}</td>
                  <td className="py-3 pr-4 telemetry text-sm">{metricCell(run, 'recall')}</td>
                  <td className="py-3 pr-4 telemetry text-sm">{metricCell(run, 'f1')}</td>
                  <td className="py-3 pr-4 telemetry text-sm">{metricCell(run, 'map50')}</td>
                  <td className="py-3 telemetry text-sm">{metricCell(run, 'map50_95')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="telemetry mt-3 text-xs opacity-70">
          RGB YOLO11n · 1 CPU epoch · seed 20260905 · imgsz 640
        </p>
      </GlassPanel>

      <GlassPanel className="p-5">
        <HudHeading>Alignment diagnostics — not detector mAP</HudHeading>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          <span className="telemetry">{alignment.correspondenceCount}</span> exploratory YOLO-center
          matches. Mean normalized center displacement with no transform is{' '}
          <span className="telemetry">{identity?.meanError.toFixed(4)}</span>. Affine reduces that
          to <span className="telemetry">{affine?.meanError.toFixed(4)}</span>. Homography is{' '}
          <span className="telemetry telemetry-orange">
            {homography?.meanError.toFixed(4)} pooled
          </span>{' '}
          but unstable across frame windows, so it is not used to warp a fused overlay.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Transform</th>
                <th className="py-2 pr-4 font-medium">Mean center error</th>
                <th className="py-2 pr-4 font-medium">Median</th>
                <th className="py-2 pr-4 font-medium">Max</th>
                <th className="py-2 pr-4 font-medium">Inliers / points</th>
                <th className="py-2 font-medium">Window stability</th>
              </tr>
            </thead>
            <tbody>
              {alignment.fits.map((fit) => (
                <tr key={fit.name} className="border-t border-cyan-900/40">
                  <td className="py-2 pr-4 font-mono text-slate-200">{fit.name}</td>
                  <td
                    className={`py-2 pr-4 telemetry text-sm ${
                      fit.name === 'affine_ransac'
                        ? ''
                        : fit.name === 'homography_ransac'
                          ? 'telemetry-orange'
                          : ''
                    }`}
                  >
                    {fit.meanError.toFixed(4)}
                  </td>
                  <td className="py-2 pr-4 telemetry text-sm">{fit.medianError.toFixed(4)}</td>
                  <td className="py-2 pr-4 telemetry text-sm">{fit.maxError.toFixed(4)}</td>
                  <td className="py-2 pr-4 font-mono text-slate-300">
                    {fit.inliersOrPoints}
                  </td>
                  <td className="py-2">
                    <StatusBadge tone={fit.stableAcrossWindows ? 'cyan' : 'orange'}>
                      {fit.stableAcrossWindows ? 'Stable' : 'Unstable'}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="telemetry mt-3 text-xs opacity-70">
          Source: geometric_alignment CSVs · normalized coordinates, not mAP
        </p>
      </GlassPanel>
    </div>
  )
}
