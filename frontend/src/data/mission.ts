export type DetectionBox = {
  score: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RecentDetection = {
  id: string;
  score: string;
  when: string;
  location: string;
  seed: number;
};

export type AlertItem = {
  id: string;
  severity: "HIGH" | "MEDIUM";
  confidence: string;
  location: string;
  time: string;
  date: string;
  seed: number;
};

export const operator = {
  name: "Operator",
  role: "Operator",
};

export const weather = {
  temp: "28°C",
  place: "New Delhi, India",
  date: "16 Oct 2026",
  time: "03:24 PM",
};

export const rgbBoxes: DetectionBox[] = [
  { score: "0.92", x: 16, y: 6, w: 16, h: 24 },
  { score: "0.87", x: 44, y: 40, w: 16, h: 24 },
  { score: "0.81", x: 68, y: 70, w: 15, h: 22 },
];

export const thermalBoxes: DetectionBox[] = [
  { score: "0.89", x: 18, y: 22, w: 16, h: 26 },
  { score: "0.83", x: 60, y: 6, w: 16, h: 24 },
  { score: "0.76", x: 64, y: 64, w: 15, h: 24 },
];

export const recentDetections: RecentDetection[] = [
  { id: "#R001", score: "0.92", when: "16 Oct, 03:24 PM", location: "28.6141, 77.2092", seed: 11 },
  { id: "#R002", score: "0.87", when: "16 Oct, 03:24 PM", location: "28.6138, 77.2089", seed: 23 },
  { id: "#R003", score: "0.81", when: "16 Oct, 03:23 PM", location: "28.6142, 77.2095", seed: 37 },
  { id: "#R004", score: "0.76", when: "16 Oct, 03:23 PM", location: "28.6135, 77.2090", seed: 41 },
];

export const alerts: AlertItem[] = [
  {
    id: "a1",
    severity: "HIGH",
    confidence: "0.92",
    location: "28.6141, 77.2092",
    time: "03:24 PM",
    date: "16 Oct 2026",
    seed: 11,
  },
  {
    id: "a2",
    severity: "MEDIUM",
    confidence: "0.83",
    location: "28.6142, 77.2092",
    time: "03:22 PM",
    date: "16 Oct 2026",
    seed: 29,
  },
  {
    id: "a3",
    severity: "MEDIUM",
    confidence: "0.76",
    location: "28.6135, 77.2090",
    time: "03:20 PM",
    date: "16 Oct 2026",
    seed: 41,
  },
];

export const modelOptions = ["YOLO E0", "YOLO E1", "YOLO E2"] as const;

export function matchesQuery(query: string, fields: string[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => field.toLowerCase().includes(needle));
}
