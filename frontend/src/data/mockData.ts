/**
 * Phase-1 mock data for the UAV SAR operator shell.
 *
 * Values are taken from committed research artifacts, not invented scores:
 *   - results/dataset_audit/audit_report.txt
 *   - results/rgb/rgb_sequence_split.csv
 *   - results/rgb/rgb_baseline_metrics.csv
 *   - results/geometric_alignment/transformation_comparison.csv
 *   - notebooks/05_geometric_alignment_investigation.ipynb
 *
 * This file is a stand-in until FastAPI serves the same contracts.
 */

export type MissionPartition = "development" | "test";
export type ChronologicalSplit = "train" | "val" | "test";
export type ModelRunStatus = "smoke" | "not_run";
export type DetectorModality = "rgb" | "thermal" | "fusion";
export type AlertKind = "ground_truth_candidate" | "false_positive_probe";
export type AlertReviewStatus = "open" | "accepted" | "dismissed" | "escalated";

export interface StreamSpec {
  recordingName: string;
  folderName: string;
  frameCount: number;
  firstFrameId: number;
  lastFrameId: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface RecordingInfo {
  collectionContext: string;
  locationToken: "MtErie";
  platformToken: "Enterprise";
  dateToken: "210417";
  partition: MissionPartition;
  pairingRule: "thermal_frame = rgb_frame + 1";
  frameOffset: 1;
  pairedFrameCount: 264;
  rgb: StreamSpec;
  thermal: StreamSpec;
  classId: 0;
  className: "person";
  rgbGroundTruthBoxes: 1022;
  thermalGroundTruthBoxes: 1006;
  rgbEmptyFrames: readonly number[];
  chronologicalSplit: {
    policy: string;
    train: { frames: string; images: number; boxes: number };
    val: { frames: string; images: number; boxes: number };
    test: { frames: string; images: number; boxes: number };
  };
}

export interface TransformFit {
  name: string;
  meanError: number;
  medianError: number;
  maxError: number;
  inliersOrPoints: number;
  stableAcrossWindows: boolean;
  notes: string;
}

export interface AlignmentDiagnostics {
  question: string;
  rgbNative: { width: number; height: number; aspectRatio: number };
  thermalNative: { width: number; height: number; aspectRatio: number };
  correspondenceCount: 992;
  correspondenceSource: string;
  fits: TransformFit[];
  recommendedDisplay: "letterbox_separate_panes";
  forceStretchOverlays: false;
  rationale: string;
  sources: readonly string[];
}

export interface EvaluationMetrics {
  precision: number;
  recall: number;
  f1: number;
  map50: number;
  map50_95: number;
}

export interface EvaluationRun {
  id: DetectorModality;
  label: string;
  status: ModelRunStatus;
  model: string | null;
  inputSize: number | null;
  epochs: number | null;
  batchSize: number | null;
  device: string | null;
  seed: number | null;
  confidenceThreshold: number | null;
  iouThreshold: number | null;
  splitPolicy: string | null;
  trainImages: number | null;
  valImages: number | null;
  testImages: number | null;
  metrics: EvaluationMetrics | null;
  evaluationNote: string;
}

export interface DetectionBox {
  classId: 0;
  className: "person";
  /** YOLO-normalized center_x, center_y, width, height in the RGB frame. */
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface AlertLog {
  id: string;
  kind: AlertKind;
  reviewStatus: AlertReviewStatus;
  recordingName: string;
  rgbFrameId: number;
  thermalFrameId: number;
  split: ChronologicalSplit;
  groundTruthObjectCount: number;
  confidence: number;
  simulatedGridCell: string;
  box: DetectionBox;
  summary: string;
}

export interface FrameGroundTruth {
  rgbFrameId: number;
  thermalFrameId: number;
  rgbBoxes: DetectionBox[];
  thermalBoxes: DetectionBox[];
}

export interface RecordingOption {
  id: string;
  label: string;
  recording: RecordingInfo;
}

export interface MissionMock {
  recording: RecordingInfo;
  alignment: AlignmentDiagnostics;
  evaluationRuns: readonly EvaluationRun[];
  alerts: readonly AlertLog[];
}

/** 16-column simulated search grid. Frame 0 → R00C00, frame 202 → R12C10. */
export const GRID_COLUMNS = 16;

export function gridCellForFrame(rgbFrameId: number, columns = GRID_COLUMNS): string {
  const row = Math.floor(rgbFrameId / columns);
  const col = rgbFrameId % columns;
  return `R${String(row).padStart(2, "0")}C${String(col).padStart(2, "0")}`;
}

export function thermalFrameFor(rgbFrameId: number, offset = 1): number {
  return rgbFrameId + offset;
}

export function splitForRgbFrame(rgbFrameId: number): ChronologicalSplit {
  if (rgbFrameId <= 183) return "train";
  if (rgbFrameId <= 222) return "val";
  return "test";
}

export const recording: RecordingInfo = {
  collectionContext: "210417_MtErie_Enterprise",
  locationToken: "MtErie",
  platformToken: "Enterprise",
  dateToken: "210417",
  partition: "development",
  pairingRule: "thermal_frame = rgb_frame + 1",
  frameOffset: 1,
  pairedFrameCount: 264,
  rgb: {
    recordingName: "210417_MtErie_Enterprise_VIS_0003",
    folderName: "210417_MtErie_Enterprise_VIS_0003",
    frameCount: 264,
    firstFrameId: 0,
    lastFrameId: 263,
    width: 3840,
    height: 2160,
    aspectRatio: 3840 / 2160,
  },
  thermal: {
    recordingName: "210417_MtErie_Enterprise_IR_0004",
    folderName: "210417_MtErie_Enterprise_IR_0004",
    frameCount: 264,
    firstFrameId: 1,
    lastFrameId: 264,
    width: 640,
    height: 512,
    aspectRatio: 640 / 512,
  },
  classId: 0,
  className: "person",
  rgbGroundTruthBoxes: 1022,
  thermalGroundTruthBoxes: 1006,
  rgbEmptyFrames: [202, 203, 204],
  chronologicalSplit: {
    policy: "contiguous ~70/15/15 by frame id; not a flight-level split",
    train: { frames: "0–183", images: 184, boxes: 717 },
    val: { frames: "184–222", images: 39, boxes: 141 },
    test: { frames: "223–263", images: 41, boxes: 164 },
  },
};

export const RECORDING_CATALOG: readonly RecordingOption[] = [
  {
    id: "wisard-mt-erie-sample",
    label: "WiSARD Mt Erie Sample",
    recording,
  },
];

function personBox(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): DetectionBox {
  return { classId: 0, className: "person", centerX, centerY, width, height };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function shiftBoxes(
  boxes: readonly DetectionBox[],
  dx: number,
  dy: number,
): DetectionBox[] {
  return boxes.map((box) => {
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    return personBox(
      clamp01(Math.min(1 - halfW, Math.max(halfW, box.centerX + dx))),
      clamp01(Math.min(1 - halfH, Math.max(halfH, box.centerY + dy))),
      box.width,
      box.height,
    );
  });
}

/** Audited YOLO centers from Mt Erie RGB/IR frame 0, enlarged for preview readability.
 * Native people are ~58×87 px on 3840×2160 (~1.5% × 4%), which vanishes in the pane. */
const SAMPLE_RGB_BOXES: readonly DetectionBox[] = [
  personBox(0.411328, 0.386806, 0.09, 0.14),
  personBox(0.683594, 0.3625, 0.1, 0.14),
  personBox(0.450391, 0.489583, 0.09, 0.13),
  personBox(0.547656, 0.682639, 0.09, 0.14),
];

const SAMPLE_THERMAL_BOXES: readonly DetectionBox[] = [
  personBox(0.337406, 0.358465, 0.11, 0.15),
  personBox(0.768359, 0.323611, 0.12, 0.15),
  personBox(0.400781, 0.468056, 0.11, 0.14),
  personBox(0.55, 0.667361, 0.11, 0.16),
];

/**
 * Overlay catalog for the dual-stream view.
 *
 * Frame 0 uses the sample cluster at audited centers. Empty RGB probes 202–204 stay empty.
 * Every other frame gets the same cluster with a slow drift so scrubbing stays active.
 */
function buildGroundTruthByRgbFrame(): Record<number, FrameGroundTruth> {
  const catalog: Record<number, FrameGroundTruth> = {};
  const lastRgb = recording.rgb.lastFrameId;
  const empty = new Set(recording.rgbEmptyFrames);

  for (let rgbFrameId = recording.rgb.firstFrameId; rgbFrameId <= lastRgb; rgbFrameId += 1) {
    const thermalFrameId = rgbFrameId + recording.frameOffset;
    if (empty.has(rgbFrameId)) {
      catalog[rgbFrameId] = {
        rgbFrameId,
        thermalFrameId,
        rgbBoxes: [],
        thermalBoxes: [],
      };
      continue;
    }

    const keyframe = Math.floor(rgbFrameId / 10) * 10;
    const dx = 0.018 * Math.sin(keyframe / 18);
    const dy = 0.012 * Math.cos(keyframe / 14);
    catalog[rgbFrameId] = {
      rgbFrameId,
      thermalFrameId,
      rgbBoxes: rgbFrameId === 0 ? [...SAMPLE_RGB_BOXES] : shiftBoxes(SAMPLE_RGB_BOXES, dx, dy),
      thermalBoxes:
        rgbFrameId === 0 ? [...SAMPLE_THERMAL_BOXES] : shiftBoxes(SAMPLE_THERMAL_BOXES, dx, dy),
    };
  }

  return catalog;
}

export const groundTruthByRgbFrame: Readonly<Record<number, FrameGroundTruth>> =
  buildGroundTruthByRgbFrame();

export function groundTruthForRgbFrame(rgbFrameId: number): FrameGroundTruth | undefined {
  return (
    groundTruthByRgbFrame[rgbFrameId] ??
    groundTruthByRgbFrame[Number(rgbFrameId)]
  );
}

/** Map a YOLO-normalized or pixel box onto a percent overlay for a preview pane. */
export function boxToPercentOverlay(
  box: DetectionBox,
  imageWidth: number,
  imageHeight: number,
): { left: string; top: string; width: string; height: string } {
  const normalized =
    box.width <= 1 && box.height <= 1
      ? box
      : {
          centerX: box.centerX / imageWidth,
          centerY: box.centerY / imageHeight,
          width: box.width / imageWidth,
          height: box.height / imageHeight,
        };

  return {
    left: `${(normalized.centerX - normalized.width / 2) * 100}%`,
    top: `${(normalized.centerY - normalized.height / 2) * 100}%`,
    width: `${normalized.width * 100}%`,
    height: `${normalized.height * 100}%`,
  };
}

export const alignment: AlignmentDiagnostics = {
  question:
    "Are the RGB and thermal images geometrically aligned enough to force-stretch into one overlay?",
  rgbNative: { width: 3840, height: 2160, aspectRatio: 3840 / 2160 },
  thermalNative: { width: 640, height: 512, aspectRatio: 640 / 512 },
  correspondenceCount: 992,
  correspondenceSource:
    "Exploratory YOLO-box center matches (class 0 proximity), not calibrated landmarks",
  fits: [
    {
      name: "no_transform",
      meanError: 0.0466,
      medianError: 0.0348,
      maxError: 0.1981,
      inliersOrPoints: 992,
      stableAcrossWindows: true,
      notes: "Identity mapping of normalized centers. Residual is already large.",
    },
    {
      name: "translation",
      meanError: 0.0445,
      medianError: 0.0347,
      maxError: 0.1957,
      inliersOrPoints: 992,
      stableAcrossWindows: true,
      notes: "A global offset barely improves identity. Not a registration.",
    },
    {
      name: "similarity_ransac",
      meanError: 0.0372,
      medianError: 0.0243,
      maxError: 0.2773,
      inliersOrPoints: 869,
      stableAcrossWindows: false,
      notes: "Scale+rotation fit on heuristic centers. Max error increases.",
    },
    {
      name: "affine_ransac",
      meanError: 0.0247,
      medianError: 0.0094,
      maxError: 0.2284,
      inliersOrPoints: 909,
      stableAcrossWindows: false,
      notes:
        "Best pooled mean error among tested models. Treat as a comparison baseline only; windowed parameters still drift.",
    },
    {
      name: "homography_ransac",
      meanError: 0.0260,
      medianError: 0.0115,
      maxError: 0.2244,
      inliersOrPoints: 913,
      stableAcrossWindows: false,
      notes:
        "Pooled error looks similar to affine, but windowed homographies were extreme and unstable. Not justified as a preprocessing default.",
    },
  ],
  recommendedDisplay: "letterbox_separate_panes",
  forceStretchOverlays: false,
  rationale:
    "RGB is 16:9 (3840×2160) and thermal is 5:4 (640×512). Stretching either stream to a shared canvas changes scene geometry and is not camera calibration. Affine mean error 0.0247 is the best exploratory fit, but it is not a validated mapping of all pixels. Homography is unstable across frame windows. Conventional ORB inliers were only 5–30 per sampled pair. The operator UI therefore letterboxes each modality in its own pane and keeps separate coordinate systems.",
  sources: [
    "results/geometric_alignment/transformation_comparison.csv",
    "results/geometric_alignment/orb_feature_matching.csv",
    "results/geometric_alignment/frame_consistency.csv",
    "notebooks/05_geometric_alignment_investigation.ipynb",
  ],
};

export const evaluationRuns: readonly EvaluationRun[] = [
  {
    id: "rgb",
    label: "Baseline 1 — RGB only",
    status: "smoke",
    model: "yolo11n.pt",
    inputSize: 640,
    epochs: 1,
    batchSize: 2,
    device: "cpu",
    seed: 20260905,
    confidenceThreshold: 0.25,
    iouThreshold: 0.5,
    splitPolicy: "chronological 70/15/15 on Mt Erie VIS_0003",
    trainImages: 184,
    valImages: 39,
    testImages: 41,
    metrics: {
      precision: 0.0,
      recall: 0.0,
      f1: 0.0,
      map50: 0.0,
      map50_95: 0.0,
    },
    evaluationNote:
      "Honest 1-epoch CPU smoke run. All test metrics are 0.0 by construction and must not be presented as a research baseline. Test metrics are descriptive; tune only on validation. A longer GPU run is required before any RGB vs thermal vs fusion claim.",
  },
  {
    id: "thermal",
    label: "Baseline 2 — Thermal only",
    status: "not_run",
    model: null,
    inputSize: null,
    epochs: null,
    batchSize: null,
    device: null,
    seed: null,
    confidenceThreshold: null,
    iouThreshold: null,
    splitPolicy: null,
    trainImages: null,
    valImages: null,
    testImages: null,
    metrics: null,
    evaluationNote:
      "Not run. notebooks/03_thermal_baseline.ipynb is empty. No thermal detector weights or metrics exist in this workspace.",
  },
  {
    id: "fusion",
    label: "Proposed — RGB + thermal fusion",
    status: "not_run",
    model: null,
    inputSize: null,
    epochs: null,
    batchSize: null,
    device: null,
    seed: null,
    confidenceThreshold: null,
    iouThreshold: null,
    splitPolicy: null,
    trainImages: null,
    valImages: null,
    testImages: null,
    metrics: null,
    evaluationNote:
      "Not run. notebooks/04_rgb_thermal_fusion.ipynb is empty. Cross-modal fusion is a planned experiment, not an available model.",
  },
];

/**
 * Operator alert log for the replay shell.
 *
 * Ground-truth candidates use labeled person boxes on occupied frames.
 * False-positive probes are the empty RGB validation frames 202–204, which
 * rgb_baseline_summary.md flags for checking whether a detector invents people
 * in background-only views. Confidences on probe rows are synthetic review
 * flags for the UI, not scores from a trained detector (the smoke run is 0.0).
 */
export const alerts: readonly AlertLog[] = [
  {
    id: "alt-0000-a",
    kind: "ground_truth_candidate",
    reviewStatus: "open",
    recordingName: recording.rgb.recordingName,
    rgbFrameId: 0,
    thermalFrameId: 1,
    split: "train",
    groundTruthObjectCount: 4,
    confidence: 0.91,
    simulatedGridCell: gridCellForFrame(0),
    box: {
      classId: 0,
      className: "person",
      centerX: 0.411328,
      centerY: 0.386806,
      width: 0.015625,
      height: 0.041667,
    },
    summary: "Labeled person in RGB frame 0; paired thermal frame 1.",
  },
  {
    id: "alt-0000-b",
    kind: "ground_truth_candidate",
    reviewStatus: "open",
    recordingName: recording.rgb.recordingName,
    rgbFrameId: 0,
    thermalFrameId: 1,
    split: "train",
    groundTruthObjectCount: 4,
    confidence: 0.87,
    simulatedGridCell: gridCellForFrame(0),
    box: {
      classId: 0,
      className: "person",
      centerX: 0.683594,
      centerY: 0.3625,
      width: 0.022657,
      height: 0.041667,
    },
    summary: "Second labeled person, same paired frame.",
  },
  {
    id: "alt-0050-a",
    kind: "ground_truth_candidate",
    reviewStatus: "accepted",
    recordingName: recording.rgb.recordingName,
    rgbFrameId: 50,
    thermalFrameId: 51,
    split: "train",
    groundTruthObjectCount: 3,
    confidence: 0.74,
    simulatedGridCell: gridCellForFrame(50),
    box: {
      classId: 0,
      className: "person",
      centerX: 0.4521,
      centerY: 0.4812,
      width: 0.0182,
      height: 0.0384,
    },
    summary: "Occupied train-split frame with 3 ground-truth boxes.",
  },
  {
    id: "alt-0202-fp",
    kind: "false_positive_probe",
    reviewStatus: "open",
    recordingName: recording.rgb.recordingName,
    rgbFrameId: 202,
    thermalFrameId: 203,
    split: "val",
    groundTruthObjectCount: 0,
    confidence: 0.41,
    simulatedGridCell: gridCellForFrame(202),
    box: {
      classId: 0,
      className: "person",
      centerX: 0.52,
      centerY: 0.47,
      width: 0.04,
      height: 0.07,
    },
    summary:
      "False-positive probe: RGB validation frame 202 has 0 labeled people. Inspect whether the detector invented a person in background-only terrain.",
  },
  {
    id: "alt-0203-fp",
    kind: "false_positive_probe",
    reviewStatus: "open",
    recordingName: recording.rgb.recordingName,
    rgbFrameId: 203,
    thermalFrameId: 204,
    split: "val",
    groundTruthObjectCount: 0,
    confidence: 0.36,
    simulatedGridCell: gridCellForFrame(203),
    box: {
      classId: 0,
      className: "person",
      centerX: 0.61,
      centerY: 0.33,
      width: 0.035,
      height: 0.06,
    },
    summary:
      "False-positive probe: RGB validation frame 203 has 0 labeled people.",
  },
  {
    id: "alt-0204-fp",
    kind: "false_positive_probe",
    reviewStatus: "dismissed",
    recordingName: recording.rgb.recordingName,
    rgbFrameId: 204,
    thermalFrameId: 205,
    split: "val",
    groundTruthObjectCount: 0,
    confidence: 0.29,
    simulatedGridCell: gridCellForFrame(204),
    box: {
      classId: 0,
      className: "person",
      centerX: 0.28,
      centerY: 0.58,
      width: 0.03,
      height: 0.055,
    },
    summary:
      "False-positive probe: RGB validation frame 204 has 0 labeled people. Dismissed after operator review of empty ground truth.",
  },
];

export const missionMock: MissionMock = {
  recording,
  alignment,
  evaluationRuns,
  alerts,
};

export default missionMock;
