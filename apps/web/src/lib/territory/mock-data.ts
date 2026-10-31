import {
  LEAGUE_BANDS,
  cellCenter,
  formatPace,
  haversineMeters,
  type LeagueCode,
  type LngLat,
} from "@dubai-run/core";
import type {
  CellStatus,
  RunnerProfile,
  TerritoryCell,
  TerritoryData,
  TerritoryStats,
  ThreatInfo,
  UserProfile,
} from "./types";

export const CURRENT_USER: UserProfile = {
  alias: "sal.kite",
  initials: "SK",
  league: "advanced",
};

export function getInitials(alias: string | null | undefined): string {
  if (!alias) return "—";
  const cleaned = alias.trim().replace(/[^a-zA-Z0-9.\-_]/g, "");
  const parts = cleaned.split(/[.\-_]/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return (first + second).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

type RivalDef = { alias: string; basePaceS: number };

const LEAGUE_ROSTERS: Record<
  LeagueCode,
  {
    userPace: number;
    rivals: RivalDef[];
  }
> = {
  elite: {
    userPace: 246, // ~4:06 /km
    rivals: [
      { alias: "layla.fly", basePaceS: 232 }, // ~3:52 /km
      { alias: "gulf.split", basePaceS: 241 }, // ~4:01 /km
      { alias: "marathon.dxb", basePaceS: 238 }, // ~3:58 /km
      { alias: "turbo.rashid", basePaceS: 244 }, // ~4:04 /km
    ],
  },
  advanced: {
    userPace: 288, // ~4:48 /km
    rivals: [
      { alias: "noor.pace", basePaceS: 275 }, // ~4:35 /km
      { alias: "kite.club", basePaceS: 298 }, // ~4:58 /km
      { alias: "tariq.stride", basePaceS: 282 }, // ~4:42 /km
      { alias: "jumeirah.speed", basePaceS: 292 }, // ~4:52 /km
    ],
  },
  intermediate: {
    userPace: 340, // ~5:40 /km
    rivals: [
      { alias: "jumeirah.am", basePaceS: 325 }, // ~5:25 /km
      { alias: "salt.flat", basePaceS: 355 }, // ~5:55 /km
      { alias: "corniche.crew", basePaceS: 335 }, // ~5:35 /km
      { alias: "sunset.stride", basePaceS: 348 }, // ~5:48 /km
    ],
  },
  starter: {
    userPace: 405, // ~6:45 /km
    rivals: [
      { alias: "beach.easy", basePaceS: 390 }, // ~6:30 /km
      { alias: "friday.km", basePaceS: 435 }, // ~7:15 /km
      { alias: "dubai.jogger", basePaceS: 410 }, // ~6:50 /km
      { alias: "oasis.runner", basePaceS: 420 }, // ~7:00 /km
    ],
  },
};

export function buildTerritoryData(
  cells: readonly string[],
  centerline: readonly LngLat[],
  league: LeagueCode,
  userProfile: UserProfile = CURRENT_USER,
): TerritoryData {
  const sorted = [...cells].sort(
    (left, right) =>
      alongTrack(cellCenter(left), centerline) - alongTrack(cellCenter(right), centerline),
  );

  const roster = LEAGUE_ROSTERS[league];
  const userIsOwnLeague = userProfile.league === league;

  const territoryCells: TerritoryCell[] = sorted.map((h3, index) => {
    const h = hash(`${league}:${h3}:${index}`);
    const segment = h % 100;

    // Distribute into the 4 states:
    // ~24% free, ~46% rival, ~20% mine, ~10% threatened (when viewing user's league)
    let status: CellStatus = "free";
    if (userIsOwnLeague) {
      if (segment < 24) {
        status = "free";
      } else if (segment < 70) {
        status = "rival";
      } else if (segment < 90) {
        status = "mine";
      } else {
        status = "threatened";
      }
    } else {
      // In other leagues, user does not hold territories
      status = segment < 30 ? "free" : "rival";
    }

    if (status === "free") {
      const userBest = h % 3 === 0 ? null : clampPace(roster.userPace + (h % 15) - 5, league);
      return {
        id: h3,
        status: "free",
        owner: null,
        paceFormatted: null,
        paceSeconds: null,
        achievedAtFormatted: null,
        userBestPaceFormatted: userBest ? `${formatPace(userBest)} /km` : null,
        userBestPaceSeconds: userBest,
        gapSeconds: null,
        threat: null,
      };
    }

    if (status === "mine" || status === "threatened") {
      const paceS = clampPace(roster.userPace + (h % 9) - 4, league);
      const daysAgo = 1 + (h % 10);
      const dateStr = formatDateAgo(daysAgo);

      const owner: RunnerProfile = {
        alias: userProfile.alias,
        initials: userProfile.initials,
        isCurrentUser: true,
      };

      let threat: ThreatInfo | null = null;
      if (status === "threatened") {
        const rivalIdx = h % roster.rivals.length;
        const rival = roster.rivals[rivalIdx] ?? roster.rivals[0]!;
        const rivalGap = 1 + (h % 3); // only 1-3 seconds away!
        const rivalPaceS = paceS + rivalGap;
        threat = {
          rivalAlias: rival.alias,
          rivalInitials: getInitials(rival.alias),
          rivalPaceFormatted: `${formatPace(rivalPaceS)} /km`,
          rivalPaceSeconds: rivalPaceS,
          gapSeconds: rivalGap,
        };
      }

      return {
        id: h3,
        status,
        owner,
        paceFormatted: `${formatPace(paceS)} /km`,
        paceSeconds: paceS,
        achievedAtFormatted: dateStr,
        userBestPaceFormatted: `${formatPace(paceS)} /km`,
        userBestPaceSeconds: paceS,
        gapSeconds: null,
        threat,
      };
    }

    // status === "rival"
    const rivalIdx = h % roster.rivals.length;
    const rival = roster.rivals[rivalIdx] ?? roster.rivals[0]!;
    const paceS = clampPace(rival.basePaceS + (h % 9) - 4, league);
    const daysAgo = 1 + (h % 14);
    const dateStr = formatDateAgo(daysAgo);

    const owner: RunnerProfile = {
      alias: rival.alias,
      initials: getInitials(rival.alias),
      isCurrentUser: false,
    };

    // User's best pace on this rival cell
    const hasUserBest = h % 4 !== 0;
    const userBestS = hasUserBest ? clampPace(paceS + 4 + (h % 12), league) : null;
    const gapSeconds = userBestS !== null ? userBestS - paceS + 1 : 1;

    return {
      id: h3,
      status: "rival",
      owner,
      paceFormatted: `${formatPace(paceS)} /km`,
      paceSeconds: paceS,
      achievedAtFormatted: dateStr,
      userBestPaceFormatted: userBestS ? `${formatPace(userBestS)} /km` : null,
      userBestPaceSeconds: userBestS,
      gapSeconds,
      threat: null,
    };
  });

  const stats: TerritoryStats = territoryCells.reduce<TerritoryStats>(
    (acc, cell) => {
      acc[cell.status] += 1;
      acc.total += 1;
      return acc;
    },
    { mine: 0, threatened: 0, rival: 0, free: 0, total: 0 },
  );

  return {
    league,
    userProfile,
    cells: territoryCells,
    stats,
  };
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

function formatDateAgo(daysAgo: number): string {
  const d = new Date("2026-10-31T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} 2026`;
}
