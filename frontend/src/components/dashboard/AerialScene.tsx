import { useId, useMemo } from "react";

type Point = { x: number; y: number };

type AerialSceneProps = {
  mode: "rgb" | "thermal" | "thumb" | "map";
  people?: Point[];
  seed?: number;
  className?: string;
};

function mulberry(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function blobs(seed: number, count: number, min: number, max: number) {
  const rand = mulberry(seed);
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    r: min + rand() * (max - min),
    shade: rand(),
  }));
}

const matrices: Record<AerialSceneProps["mode"], string> = {
  rgb: "0.04 0.22 0.02 0 0.03  0.06 0.34 0.03 0 0.1  0.02 0.12 0.03 0 0.04  0 0 0 1 0",
  thermal: "0.42 0.42 0.42 0 0.06  0.42 0.42 0.42 0 0.06  0.4 0.4 0.4 0 0.08  0 0 0 1 0",
  thumb: "0.16 0.2 0.05 0 0.16  0.12 0.24 0.04 0 0.18  0.06 0.1 0.04 0 0.07  0 0 0 1 0",
  map: "0.02 0.2 0.02 0 0.04  0.05 0.32 0.03 0 0.12  0.02 0.1 0.03 0 0.05  0 0 0 1 0",
};

const figureScale: Record<AerialSceneProps["mode"], number> = {
  rgb: 1.45,
  thermal: 1,
  thumb: 4.6,
  map: 1,
};

export function AerialScene({ mode, people = [], seed = 7, className }: AerialSceneProps) {
  const uid = useId().replace(/:/g, "");
  const canopy = useMemo(() => blobs(seed, mode === "thumb" ? 22 : 78, 1.2, 3.8), [seed, mode]);
  const rocks = useMemo(() => blobs(seed + 9, mode === "map" ? 6 : 8, 4, 11), [seed, mode]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id={`${uid}-noise`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={mode === "thermal" ? "0.85" : "0.75"}
            numOctaves="4"
            seed={seed}
          />
          <feColorMatrix type="matrix" values={matrices[mode]} />
        </filter>
        <radialGradient id={`${uid}-heat`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="35%" stopColor="#ff7a18" />
          <stop offset="100%" stopColor="#ff7a18" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      <rect
        width="100"
        height="100"
        fill={mode === "thermal" ? "#2a2e33" : mode === "thumb" ? "#6d624f" : "#14331d"}
      />
      <rect width="100" height="100" filter={`url(#${uid}-noise)`} opacity={mode === "thermal" ? 0.92 : 0.8} />

      {mode !== "thermal" &&
        rocks.map((rock, index) => (
          <ellipse
            key={`rock-${index}`}
            cx={rock.x}
            cy={rock.y}
            rx={rock.r}
            ry={rock.r * 0.72}
            fill={rock.shade > 0.5 ? "#8d7b63" : "#6e6254"}
            opacity={mode === "thumb" ? 0.55 : 0.28}
          />
        ))}

      {mode !== "thermal" &&
        canopy.map((tree, index) => (
          <circle
            key={`tree-${index}`}
            cx={tree.x}
            cy={tree.y}
            r={tree.r}
            fill={tree.shade > 0.55 ? "#1d6a32" : tree.shade > 0.25 ? "#2f8f45" : "#14532d"}
            opacity={mode === "thumb" ? 0.35 : 0.78}
          />
        ))}

      {mode === "map" && (
        <path
          d="M8 78 C 22 70, 28 60, 36 58 S 52 62, 60 48 S 74 30, 88 22"
          fill="none"
          stroke="#d6c4a3"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.7"
        />
      )}

      {mode === "thermal"
        ? people.map((person, index) => (
            <ellipse
              key={`heat-${index}`}
              cx={person.x}
              cy={person.y}
              rx="5.2"
              ry="8"
              fill={`url(#${uid}-heat)`}
            />
          ))
        : people.map((person, index) => (
            <g
              key={`person-${index}`}
              transform={`translate(${person.x} ${person.y}) scale(${figureScale[mode]})`}
            >
              <ellipse cx="0" cy="1.4" rx="3.1" ry="1.15" fill="#020617" opacity="0.28" />
              <ellipse cx="0" cy="-3.5" rx="1.25" ry="1.45" fill="#f0c9a6" />
              <path d="M-2.5-1.7h5l.55 4.5h-6.1z" fill="#2563eb" />
              <path d="M-1.15 2.5c-.15.9-.55 2.5-.7 3.5h1.35l.35-3.3z" fill="#0f172a" />
              <path d="M.35 2.5c.1.9.4 2.5.55 3.5h1.3l-.45-3.4z" fill="#0f172a" />
            </g>
          ))}

      <rect width="100" height="100" fill={`url(#${uid}-shade)`} opacity="0.45" />
    </svg>
  );
}
