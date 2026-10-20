export type MapPinKind = "high" | "medium" | "low";

export type MapPlacement = {
  x: number;
  y: number;
  label?: string;
};

export type LocatedTarget = {
  id: string;
  latitude: number;
  longitude: number;
  confidence: number;
  distanceM: number;
  time: string;
  date: string;
  model: string;
  altitudeM: number;
  groundLatitude: number;
  groundLongitude: number;
  locationType: string;
  gps: boolean;
  seed: number;
  map?: MapPlacement;
};

const designed: LocatedTarget[] = [
  {
    id: "AL-001",
    latitude: 28.6141,
    longitude: 77.2092,
    confidence: 0.92,
    distanceM: 184,
    time: "03:24 PM",
    date: "2026-10-16",
    model: "YOLO E0",
    altitudeM: 120,
    groundLatitude: 28.614,
    groundLongitude: 77.2095,
    locationType: "Forest - Sector B",
    gps: true,
    seed: 11,
    map: { x: 47, y: 46 },
  },
  {
    id: "AL-002",
    latitude: 28.6138,
    longitude: 77.2089,
    confidence: 0.87,
    distanceM: 210,
    time: "02:15 PM",
    date: "2026-10-16",
    model: "YOLO E0",
    altitudeM: 118,
    groundLatitude: 28.6136,
    groundLongitude: 77.2091,
    locationType: "Forest - Sector B",
    gps: true,
    seed: 23,
    map: { x: 49, y: 70 },
  },
  {
    id: "AL-003",
    latitude: 28.6142,
    longitude: 77.2095,
    confidence: 0.81,
    distanceM: 320,
    time: "01:03 PM",
    date: "2026-10-16",
    model: "YOLO E0",
    altitudeM: 122,
    groundLatitude: 28.6144,
    groundLongitude: 77.2098,
    locationType: "Forest - Sector A",
    gps: true,
    seed: 29,
    map: { x: 40, y: 34, label: "P2" },
  },
  {
    id: "AL-004",
    latitude: 28.6155,
    longitude: 77.209,
    confidence: 0.76,
    distanceM: 410,
    time: "11:32 AM",
    date: "2026-10-16",
    model: "YOLO E0",
    altitudeM: 126,
    groundLatitude: 28.6152,
    groundLongitude: 77.2093,
    locationType: "Trail corridor",
    gps: true,
    seed: 37,
    map: { x: 56, y: 48, label: "P3" },
  },
  {
    id: "AL-005",
    latitude: 28.612,
    longitude: 77.2075,
    confidence: 0.73,
    distanceM: 560,
    time: "09:18 AM",
    date: "2026-10-16",
    model: "YOLO E1",
    altitudeM: 130,
    groundLatitude: 28.6118,
    groundLongitude: 77.2078,
    locationType: "River bank",
    gps: true,
    seed: 41,
    map: { x: 63, y: 74 },
  },
  {
    id: "AL-006",
    latitude: 28.6162,
    longitude: 77.2104,
    confidence: 0.79,
    distanceM: 280,
    time: "04:10 PM",
    date: "2026-10-15",
    model: "YOLO E0",
    altitudeM: 116,
    groundLatitude: 28.616,
    groundLongitude: 77.2107,
    locationType: "Forest - Sector B",
    gps: true,
    seed: 47,
    map: { x: 42, y: 58, label: "P2" },
  },
  {
    id: "AL-007",
    latitude: 28.6158,
    longitude: 77.2112,
    confidence: 0.77,
    distanceM: 360,
    time: "02:40 PM",
    date: "2026-10-15",
    model: "YOLO E0",
    altitudeM: 124,
    groundLatitude: 28.6156,
    groundLongitude: 77.2115,
    locationType: "Clearing edge",
    gps: true,
    seed: 53,
    map: { x: 72, y: 38, label: "P5" },
  },
  {
    id: "AL-008",
    latitude: 28.6131,
    longitude: 77.2084,
    confidence: 0.75,
    distanceM: 440,
    time: "12:05 PM",
    date: "2026-10-14",
    model: "YOLO E0",
    altitudeM: 128,
    groundLatitude: 28.6129,
    groundLongitude: 77.2087,
    locationType: "Forest - Sector A",
    gps: true,
    seed: 59,
    map: { x: 60, y: 66, label: "P5" },
  },
  {
    id: "AL-009",
    latitude: 28.6114,
    longitude: 77.2068,
    confidence: 0.68,
    distanceM: 610,
    time: "10:22 AM",
    date: "2026-10-14",
    model: "YOLO E1",
    altitudeM: 134,
    groundLatitude: 28.6112,
    groundLongitude: 77.2071,
    locationType: "Ridge",
    gps: true,
    seed: 67,
    map: { x: 34, y: 52 },
  },
  {
    id: "AL-010",
    latitude: 28.617,
    longitude: 77.212,
    confidence: 0.64,
    distanceM: 690,
    time: "08:47 AM",
    date: "2026-10-13",
    model: "YOLO E0",
    altitudeM: 138,
    groundLatitude: 28.6168,
    groundLongitude: 77.2123,
    locationType: "Trail corridor",
    gps: true,
    seed: 71,
    map: { x: 54, y: 60 },
  },
  {
    id: "AL-011",
    latitude: 28.6106,
    longitude: 77.2059,
    confidence: 0.61,
    distanceM: 740,
    time: "06:15 PM",
    date: "2026-10-13",
    model: "YOLO E1",
    altitudeM: 112,
    groundLatitude: 28.6104,
    groundLongitude: 77.2062,
    locationType: "River bank",
    gps: true,
    seed: 79,
    map: { x: 68, y: 56 },
  },
];

const fillerSpecs: Array<Pick<LocatedTarget, "latitude" | "longitude" | "confidence" | "distanceM" | "time" | "date" | "locationType" | "model">> = [
  { latitude: 28.6181, longitude: 77.2133, confidence: 0.7, distanceM: 510, time: "05:12 PM", date: "2026-10-12", locationType: "Forest - Sector B", model: "YOLO E0" },
  { latitude: 28.6098, longitude: 77.2044, confidence: 0.66, distanceM: 670, time: "03:48 PM", date: "2026-10-12", locationType: "Clearing edge", model: "YOLO E0" },
  { latitude: 28.6148, longitude: 77.2061, confidence: 0.58, distanceM: 720, time: "01:26 PM", date: "2026-10-11", locationType: "Trail corridor", model: "YOLO E1" },
  { latitude: 28.6169, longitude: 77.2088, confidence: 0.55, distanceM: 780, time: "11:04 AM", date: "2026-10-11", locationType: "Forest - Sector A", model: "YOLO E0" },
  { latitude: 28.6127, longitude: 77.2118, confidence: 0.52, distanceM: 830, time: "09:40 AM", date: "2026-10-11", locationType: "Ridge", model: "YOLO E0" },
  { latitude: 28.6151, longitude: 77.2141, confidence: 0.49, distanceM: 880, time: "04:55 PM", date: "2026-10-10", locationType: "River bank", model: "YOLO E1" },
  { latitude: 28.6111, longitude: 77.2099, confidence: 0.46, distanceM: 910, time: "02:18 PM", date: "2026-10-10", locationType: "Forest - Sector B", model: "YOLO E0" },
  { latitude: 28.6177, longitude: 77.2072, confidence: 0.91, distanceM: 240, time: "07:36 PM", date: "2026-10-15", locationType: "Forest - Sector A", model: "YOLO E0" },
  { latitude: 28.6133, longitude: 77.2126, confidence: 0.84, distanceM: 390, time: "06:02 PM", date: "2026-10-14", locationType: "Clearing edge", model: "YOLO E0" },
  { latitude: 28.6102, longitude: 77.2108, confidence: 0.8, distanceM: 470, time: "04:28 PM", date: "2026-10-13", locationType: "Trail corridor", model: "YOLO E1" },
  { latitude: 28.6184, longitude: 77.2096, confidence: 0.43, distanceM: 960, time: "12:44 PM", date: "2026-10-12", locationType: "Ridge", model: "YOLO E0" },
  { latitude: 28.6092, longitude: 77.2081, confidence: 0.41, distanceM: 1020, time: "10:11 AM", date: "2026-10-10", locationType: "River bank", model: "YOLO E1" },
  { latitude: 28.6164, longitude: 77.2052, confidence: 0.88, distanceM: 265, time: "08:20 AM", date: "2026-10-16", locationType: "Forest - Sector B", model: "YOLO E0" },
];

const filler: LocatedTarget[] = fillerSpecs.map((spec, index) => {
  const number = index + designed.length + 1;
  return {
    ...spec,
    id: `AL-${String(number).padStart(3, "0")}`,
    altitudeM: 110 + ((index * 7) % 30),
    groundLatitude: Number((spec.latitude - 0.0002).toFixed(4)),
    groundLongitude: Number((spec.longitude + 0.0003).toFixed(4)),
    gps: number <= 18,
    seed: 80 + index * 3,
  };
});

export const locatedTargets: LocatedTarget[] = [...designed, ...filler];

export function locationById(id: string | undefined) {
  if (!id) return locatedTargets[0];
  return locatedTargets.find((item) => item.id.toLowerCase() === id.toLowerCase());
}

export function pinKind(confidence: number): MapPinKind {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.75) return "medium";
  return "low";
}

export function formatDegrees(value: number, hemisphere: "N" | "E") {
  return `${value.toFixed(4)}° ${hemisphere}`;
}

export const flightProfile = [
  { km: 0, altitude: 95 },
  { km: 0.3, altitude: 108 },
  { km: 0.6, altitude: 118 },
  { km: 0.9, altitude: 128 },
  { km: 1.2, altitude: 135 },
  { km: 1.5, altitude: 142 },
  { km: 1.8, altitude: 130 },
  { km: 2.1, altitude: 124 },
  { km: 2.4, altitude: 120 },
];

export const flightSummary = {
  distance: "2.4 km",
  maxAltitude: "150 m",
  avgAltitude: "120 m",
  duration: "18 min",
};
