import { rgbDetections, thermalDetections, type DetectedObject } from "./detection";

export type ResultModel = "YOLO E0" | "YOLO E1";
export type ResultInput = "RGB + Thermal" | "RGB" | "Thermal";
export type ResultStatus = "Person Found" | "No Detections";

export type MissionResult = {
  id: string;
  at: number;
  date: string;
  time: string;
  model: ResultModel;
  count: number;
  status: ResultStatus;
  input: ResultInput;
  inferenceMs: number;
  location: string;
  place: string;
  seed: number;
  objects: DetectedObject[];
  thermal: DetectedObject[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const extraObject: DetectedObject = {
  id: 4,
  className: "person",
  confidence: 0.76,
  box: [188, 286, 254, 372],
  frame: { x: 14, y: 60, w: 14, h: 24 },
  seed: 53,
};

function stamp(year: number, month: number, day: number, hour: number, minute: number, second: number) {
  const at = new Date(year, month, day, hour, minute, second);
  const hours = at.getHours();
  const h12 = hours % 12 || 12;
  const suffix = hours >= 12 ? "PM" : "AM";
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    at: at.getTime(),
    date: `${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}`,
    time: `${pad(h12)}:${pad(minute)}:${pad(second)} ${suffix}`,
  };
}

function objectsFor(count: number, seed: number) {
  const rgb = [...rgbDetections, extraObject].slice(0, count).map((object, index) => ({
    ...object,
    id: index + 1,
    seed: seed + index,
  }));
  const thermal = thermalDetections.slice(0, Math.min(count, thermalDetections.length)).map((object, index) => ({
    ...object,
    id: index + 1,
    seed: seed + 20 + index,
  }));
  return { objects: rgb, thermal };
}

type Spec = {
  id: string;
  when: [number, number, number, number, number, number];
  model: ResultModel;
  count: number;
  input: ResultInput;
  inferenceMs: number;
  location: string;
  seed: number;
};

const specs: Spec[] = [
  { id: "R024", when: [2026, 9, 16, 15, 24, 12], model: "YOLO E0", count: 3, input: "RGB + Thermal", inferenceMs: 42, location: "28.6141, 77.2092", seed: 11 },
  { id: "R023", when: [2026, 9, 16, 14, 15, 48], model: "YOLO E0", count: 2, input: "RGB + Thermal", inferenceMs: 39, location: "28.6138, 77.2089", seed: 23 },
  { id: "R022", when: [2026, 9, 16, 13, 3, 27], model: "YOLO E0", count: 0, input: "RGB", inferenceMs: 28, location: "28.6102, 77.2044", seed: 31 },
  { id: "R021", when: [2026, 9, 15, 16, 45, 11], model: "YOLO E0", count: 1, input: "RGB + Thermal", inferenceMs: 41, location: "28.6142, 77.2095", seed: 37 },
  { id: "R020", when: [2026, 9, 15, 11, 32, 9], model: "YOLO E0", count: 0, input: "Thermal", inferenceMs: 31, location: "28.6088, 77.2011", seed: 43 },
  { id: "R019", when: [2026, 9, 14, 17, 12, 36], model: "YOLO E0", count: 4, input: "RGB + Thermal", inferenceMs: 46, location: "28.6160, 77.2110", seed: 47 },
  { id: "R018", when: [2026, 9, 14, 15, 21, 17], model: "YOLO E0", count: 1, input: "RGB", inferenceMs: 36, location: "28.6135, 77.2090", seed: 53 },
  { id: "R017", when: [2026, 9, 14, 10, 8, 54], model: "YOLO E0", count: 0, input: "RGB", inferenceMs: 27, location: "28.6094, 77.2066", seed: 59 },
  { id: "R016", when: [2026, 9, 13, 18, 42, 5], model: "YOLO E1", count: 2, input: "Thermal", inferenceMs: 38, location: "28.6114, 77.2072", seed: 61 },
  { id: "R015", when: [2026, 9, 13, 16, 5, 33], model: "YOLO E0", count: 1, input: "RGB + Thermal", inferenceMs: 40, location: "28.6128, 77.2081", seed: 67 },
  { id: "R014", when: [2026, 9, 13, 11, 18, 44], model: "YOLO E0", count: 0, input: "RGB", inferenceMs: 26, location: "28.6077, 77.1998", seed: 71 },
  { id: "R013", when: [2026, 9, 12, 19, 2, 18], model: "YOLO E0", count: 3, input: "RGB + Thermal", inferenceMs: 44, location: "28.6155, 77.2104", seed: 73 },
  { id: "R012", when: [2026, 9, 12, 14, 47, 9], model: "YOLO E1", count: 1, input: "Thermal", inferenceMs: 35, location: "28.6099, 77.2055", seed: 79 },
  { id: "R011", when: [2026, 9, 12, 9, 26, 51], model: "YOLO E0", count: 0, input: "RGB", inferenceMs: 24, location: "28.6064, 77.1984", seed: 83 },
  { id: "R010", when: [2026, 9, 11, 17, 55, 22], model: "YOLO E0", count: 2, input: "RGB + Thermal", inferenceMs: 37, location: "28.6131, 77.2086", seed: 89 },
  { id: "R009", when: [2026, 9, 11, 13, 11, 6], model: "YOLO E0", count: 1, input: "RGB", inferenceMs: 33, location: "28.6122, 77.2077", seed: 97 },
  { id: "R008", when: [2026, 9, 11, 8, 40, 15], model: "YOLO E1", count: 0, input: "Thermal", inferenceMs: 29, location: "28.6058, 77.1971", seed: 101 },
  { id: "R007", when: [2026, 9, 10, 18, 16, 41], model: "YOLO E0", count: 3, input: "RGB + Thermal", inferenceMs: 43, location: "28.6148, 77.2098", seed: 103 },
  { id: "R006", when: [2026, 9, 10, 15, 3, 28], model: "YOLO E0", count: 2, input: "RGB + Thermal", inferenceMs: 39, location: "28.6119, 77.2069", seed: 107 },
  { id: "R005", when: [2026, 9, 10, 12, 22, 3], model: "YOLO E0", count: 1, input: "RGB", inferenceMs: 34, location: "28.6108, 77.2049", seed: 109 },
  { id: "R004", when: [2026, 9, 10, 10, 48, 57], model: "YOLO E1", count: 0, input: "Thermal", inferenceMs: 30, location: "28.6049, 77.1962", seed: 113 },
  { id: "R003", when: [2026, 9, 10, 9, 14, 36], model: "YOLO E0", count: 4, input: "RGB + Thermal", inferenceMs: 47, location: "28.6166, 77.2118", seed: 127 },
  { id: "R002", when: [2026, 9, 10, 8, 5, 19], model: "YOLO E0", count: 1, input: "RGB", inferenceMs: 32, location: "28.6081, 77.2024", seed: 131 },
  { id: "R001", when: [2026, 9, 10, 7, 33, 8], model: "YOLO E0", count: 2, input: "RGB + Thermal", inferenceMs: 36, location: "28.6136, 77.2083", seed: 137 },
];

export const MISSION_NOW = new Date(2026, 9, 16, 15, 24, 12).getTime();

export const missionResults: MissionResult[] = specs.map((spec) => {
  const when = stamp(...spec.when);
  const frames = objectsFor(spec.count, spec.seed);
  const thermal = spec.input === "RGB" ? [] : frames.thermal;
  return {
    id: spec.id,
    at: when.at,
    date: when.date,
    time: when.time,
    model: spec.model,
    count: spec.count,
    status: spec.count > 0 ? "Person Found" : "No Detections",
    input: spec.input,
    inferenceMs: spec.inferenceMs,
    location: spec.location,
    place: "New Delhi",
    seed: spec.seed,
    objects: frames.objects,
    thermal,
  };
});

export const PAGE_SIZE = 8;

export function resultById(id: string | undefined) {
  if (!id) return missionResults[0];
  return missionResults.find((result) => result.id.toLowerCase() === id.replace("#", "").toLowerCase());
}
