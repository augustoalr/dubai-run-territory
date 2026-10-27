import {
  LEAGUE_BANDS,
  cellCenter,
  formatPace,
  haversineMeters,
  type LeagueCode,
  type LngLat,
} from "@dubai-run/core";

export type CellKind = "mine" | "other" | "free";

export type MockCell = {
  h3: string;
  kind: CellKind;
  alias: string | null;
  paceS: number | null;
  achievedOn: string | null;
  yourBestPaceS: number | null;
  intensity: number;
};

export const VIEWER_ALIAS = "sal.kite";

const ROSTERS: Record<
  LeagueCode,
  { you: number; a: { alias: string; paceS: number }; b: { alias: string; paceS: number } }
> = {
  elite: {
    you: 246,
    a: { alias: "layla.fly", paceS: 231 },
    b: { alias: "gulf.split", paceS: 242 },
  },
  advanced: {
    you: 287,
    a: { alias: "noor.pace", paceS: 268 },
    b: { alias: "kite.club", paceS: 304 },
  },
  intermediate: {
    you: 339,
    a: { alias: "jumeirah.am", paceS: 324 },
    b: { alias: "salt.flat", paceS: 358 },
  },
  starter: {
    you: 404,
    a: { alias: "beach.easy", paceS: 390 },
    b: { alias: "friday.km", paceS: 438 },
  },
};

const PATTERN: Record<LeagueCode, Array<"free" | "you" | "a" | "b">> = {
  elite: ["free", "a", "you", "you", "b", "free"],
  advanced: ["b", "you", "free", "a", "you", "a"],
  intermediate: ["you", "free", "b", "a", "free", "you"],
  starter: ["free", "you", "b", "you", "a", "free"],
};

export function buildMockTerritory(
  cells: readonly string[],
  centerline: readonly LngLat[],
  league: LeagueCode,
): MockCell[] {
  const sorted = [...cells].sort(
    (left, right) =>
      alongTrack(cellCenter(left), centerline) - alongTrack(cellCenter(right), centerline),
  );
  const rhythm = PATTERN[league];
  const roster = ROSTERS[league];
  const tokens: Array<"free" | "you" | "a" | "b"> = [];
  let step = 0;
  while (tokens.length < sorted.length) {
    const token = rhythm[step % rhythm.length] ?? "free";
    const size = 5 + (hash(`${league}:${step}`) % 4);
    for (let i = 0; i < size && tokens.length < sorted.length; i += 1) tokens.push(token);
    step += 1;
  }

  return sorted.map((h3, index) => {
    const token = tokens[index] ?? "free";
    if (token === "free") {
      return {
        h3,
        kind: "free",
        alias: null,
        paceS: null,
        achievedOn: null,
        yourBestPaceS: null,
        intensity: 0,
      };
    }
    const base = token === "you" ? roster.you : token === "a" ? roster.a.paceS : roster.b.paceS;
    const paceS = clampPace(base + (hash(h3 + league) % 7) - 3, league);
    const alias = token === "you" ? VIEWER_ALIAS : token === "a" ? roster.a.alias : roster.b.alias;
    const candidateBest =
      token === "you"
        ? paceS
        : hash(h3) % 4 === 0
          ? null
          : clampPace(paceS + 6 + (hash(h3) % 9), league);
    const yourBestPaceS =
      candidateBest !== null && candidateBest <= paceS && token !== "you" ? null : candidateBest;
    return {
      h3,
      kind: token === "you" ? "mine" : "other",
      alias,
      paceS,
      achievedOn: addDays("2026-10-19", hash(h3 + "day") % 8),
      yourBestPaceS,
      intensity: intensityFor(paceS, league),
    };
  });
}

export function paintCell(cell: MockCell): { color: string; opacity: number; lineColor: string } {
  if (cell.kind === "free") {
    return { color: "#10160f", opacity: 0.2, lineColor: "rgba(214, 255, 60, 0.72)" };
  }
  if (cell.kind === "mine") {
    return { color: "#d6ff3c", opacity: 0.8, lineColor: "#f6ffd0" };
  }
  return {
    color: mixHex("#66758a", "#b8fbff", cell.intensity),
    opacity: 0.34 + cell.intensity * 0.4,
    lineColor: mixHex("#9aabbe", "#f4feff", cell.intensity),
  };
}

export function paceLabel(paceS: number | null): string | null {
  if (paceS === null) return null;
  return formatPace(paceS);
}

function intensityFor(paceS: number, league: LeagueCode): number {
  const band = LEAGUE_BANDS.find((item) => item.code === league);
  const min = band?.minPaceS ?? 200;
  const max = band?.maxPaceS ?? 520;
  const span = Math.max(1, max - min);
  const normalized = Math.min(1, Math.max(0, (paceS - min) / span));
  return 1 - normalized;
}

function clampPace(paceS: number, league: LeagueCode): number {
  const band = LEAGUE_BANDS.find((item) => item.code === league);
  const min = band?.minPaceS ?? 200;
  const max = band?.maxPaceS ?? 520;
  return Math.min(max, Math.max(min, Math.round(paceS)));
}

function alongTrack(point: LngLat, line: readonly LngLat[]): number {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestAlong = 0;
  let walked = 0;
  for (let i = 1; i < line.length; i += 1) {
    const start = line[i - 1];
    const end = line[i];
    if (!start || !end) continue;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length2 = dx * dx + dy * dy || 1;
    const t = Math.max(
      0,
      Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length2),
    );
    const projected: LngLat = [start[0] + t * dx, start[1] + t * dy];
    const distance = haversineMeters(point, projected);
    const segment = haversineMeters(start, end);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAlong = walked + segment * t;
    }
    walked += segment;
  }
  return bestAlong;
}

function hash(value: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

function addDays(isoDay: string, days: number): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mixHex(from: string, to: string, t: number): string {
  const amount = Math.min(1, Math.max(0, t));
  const left = hexToRgb(from);
  const right = hexToRgb(to);
  const channel = (index: 0 | 1 | 2) =>
    Math.round((left[index] ?? 0) + ((right[index] ?? 0) - (left[index] ?? 0)) * amount);
  return `#${[channel(0), channel(1), channel(2)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}
