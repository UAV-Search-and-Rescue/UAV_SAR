export type FrameBox = { x: number; y: number; w: number; h: number };

export type DetectedObject = {
  id: number;
  className: "person";
  confidence: number;
  box: [number, number, number, number];
  frame: FrameBox;
  seed: number;
};

export type ModelOption = {
  id: "e0" | "e1" | "e2";
  label: string;
  status: "Available" | "Planned";
};

export const detectionModels: ModelOption[] = [
  { id: "e0", label: "E0 - YOLO (RGB)", status: "Available" },
  { id: "e1", label: "E1 - YOLO (IR)", status: "Available" },
  { id: "e2", label: "E2 - Fusion", status: "Planned" },
];

export const imageSizes = [
  { id: "640", label: "640 × 640 (Default)" },
  { id: "320", label: "320 × 320" },
  { id: "1280", label: "1280 × 1280" },
];

export const rgbDetections: DetectedObject[] = [
  { id: 1, className: "person", confidence: 0.92, box: [345, 120, 412, 210], frame: { x: 28, y: 18, w: 16, h: 28 }, seed: 11 },
  { id: 2, className: "person", confidence: 0.87, box: [522, 236, 588, 318], frame: { x: 46, y: 42, w: 15, h: 26 }, seed: 23 },
  { id: 3, className: "person", confidence: 0.81, box: [698, 310, 762, 395], frame: { x: 64, y: 62, w: 14, h: 24 }, seed: 37 },
];

export const thermalDetections: DetectedObject[] = [
  { id: 1, className: "person", confidence: 0.89, box: [210, 140, 286, 248], frame: { x: 22, y: 24, w: 16, h: 30 }, seed: 19 },
  { id: 2, className: "person", confidence: 0.83, box: [470, 118, 540, 230], frame: { x: 58, y: 16, w: 15, h: 28 }, seed: 29 },
  { id: 3, className: "person", confidence: 0.76, box: [520, 280, 590, 390], frame: { x: 62, y: 58, w: 15, h: 26 }, seed: 41 },
];

export function formatConfidence(value: number) {
  return value.toFixed(2);
}

export function confidenceTone(value: number) {
  return value >= 0.85 ? "bg-rose-100 text-rose-500" : "bg-amber-100 text-amber-600";
}
