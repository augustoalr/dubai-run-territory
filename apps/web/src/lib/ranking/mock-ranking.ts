import {
  calculateRanking,
  type LeagueCode,
  type RankedRunner,
  type RankingCandidate,
} from "@dubai-run/core";
import type { LeagueRankingData, SeasonInfo } from "./types";

/**
 * Calculates days remaining from an ISO date string.
 */
export function calculateDaysRemaining(endsAt: string): {
  daysRemaining: number;
  isFinished: boolean;
} {
  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) {
    return { daysRemaining: 0, isFinished: true };
  }
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { daysRemaining: Math.max(0, days), isFinished: false };
}

/**
 * Creates dynamic mock season metadata with 11-12 days remaining for active display.
 */
export function getMockSeason(): SeasonInfo {
  const now = Date.now();
  // 3-week season starting 9 days ago and ending in 12 days
  const startsAt = new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString();
  const endsAt = new Date(now + 12 * 24 * 60 * 60 * 1000).toISOString();
  const { daysRemaining, isFinished } = calculateDaysRemaining(endsAt);

  return {
    id: "mock-season-1",
    name: "Temporada 1",
    startsAt,
    endsAt,
    daysRemaining,
    isFinished,
  };
}

const MOCK_ROSTERS: Record<LeagueCode, RankingCandidate[]> = {
  starter: [
    {
      userId: "u-starter-1",
      alias: "beach.easy",
      points: 145,
      cellsOwned: 14,
      distanceInZoneMeters: 48_200,
      achievedAt: "2026-11-04T08:30:00Z",
    },
    {
      userId: "u-starter-2",
      alias: "dubai.jogger",
      points: 130,
      cellsOwned: 11,
      distanceInZoneMeters: 42_100,
      achievedAt: "2026-11-03T17:15:00Z",
    },
    {
      userId: "u-starter-3",
      alias: "oasis.runner",
      points: 115,
      cellsOwned: 9,
      distanceInZoneMeters: 38_600,
      achievedAt: "2026-11-02T07:45:00Z",
    },
    {
      userId: "u-starter-4",
      alias: "friday.km",
      points: 92,
      cellsOwned: 7,
      distanceInZoneMeters: 31_000,
      achievedAt: "2026-11-01T06:20:00Z",
    },
    {
      userId: "u-starter-5",
      alias: "jumeirah.breeze",
      points: 78,
      cellsOwned: 5,
      distanceInZoneMeters: 26_400,
      achievedAt: "2026-10-30T18:00:00Z",
    },
    {
      userId: "u-starter-6",
      alias: "kite.sunrise",
      points: 64,
      cellsOwned: 4,
      distanceInZoneMeters: 22_000,
      achievedAt: "2026-10-29T06:50:00Z",
    },
    {
      userId: "u-starter-7",
      alias: "marina.stride",
      points: 45,
      cellsOwned: 3,
      distanceInZoneMeters: 16_500,
      achievedAt: "2026-10-28T19:10:00Z",
    },
  ],
  intermediate: [
    {
      userId: "u-inter-1",
      alias: "jumeirah.am",
      points: 168,
      cellsOwned: 18,
      distanceInZoneMeters: 56_400,
      achievedAt: "2026-11-05T07:10:00Z",
    },
    {
      userId: "u-inter-2",
      alias: "corniche.crew",
      points: 152,
      cellsOwned: 14,
      distanceInZoneMeters: 51_200,
      achievedAt: "2026-11-04T18:30:00Z",
    },
    {
      userId: "u-inter-3",
      alias: "sunset.stride",
      points: 138,
      cellsOwned: 12,
      distanceInZoneMeters: 46_800,
      achievedAt: "2026-11-03T17:50:00Z",
    },
    {
      userId: "u-inter-4",
      alias: "salt.flat",
      points: 118,
      cellsOwned: 9,
      distanceInZoneMeters: 39_500,
      achievedAt: "2026-11-02T06:40:00Z",
    },
    {
      userId: "u-inter-5",
      alias: "canal.tempo",
      points: 94,
      cellsOwned: 6,
      distanceInZoneMeters: 32_100,
      achievedAt: "2026-10-31T07:00:00Z",
    },
    {
      userId: "u-inter-6",
      alias: "downtown.legs",
      points: 76,
      cellsOwned: 5,
      distanceInZoneMeters: 25_800,
      achievedAt: "2026-10-29T18:20:00Z",
    },
    {
      userId: "u-inter-7",
      alias: "palm.runner",
      points: 58,
      cellsOwned: 3,
      distanceInZoneMeters: 20_400,
      achievedAt: "2026-10-28T06:30:00Z",
    },
  ],
  advanced: [
    {
      userId: "u-adv-1",
      alias: "noor.pace",
      points: 185,
      cellsOwned: 20,
      distanceInZoneMeters: 64_200,
      achievedAt: "2026-11-06T06:45:00Z",
    },
    {
      userId: "u-adv-2",
      alias: "tariq.stride",
      points: 172,
      cellsOwned: 17,
      distanceInZoneMeters: 59_800,
      achievedAt: "2026-11-05T17:20:00Z",
    },
    {
      userId: "u-adv-3",
      alias: "sal.kite",
      points: 154,
      cellsOwned: 15,
      distanceInZoneMeters: 52_300,
      achievedAt: "2026-11-04T07:05:00Z",
    },
    {
      userId: "u-adv-4",
      alias: "jumeirah.speed",
      points: 140,
      cellsOwned: 12,
      distanceInZoneMeters: 47_000,
      achievedAt: "2026-11-03T18:15:00Z",
    },
    {
      userId: "u-adv-5",
      alias: "kite.club",
      points: 122,
      cellsOwned: 10,
      distanceInZoneMeters: 41_500,
      achievedAt: "2026-11-02T06:30:00Z",
    },
    {
      userId: "u-adv-6",
      alias: "al.wasl.fast",
      points: 98,
      cellsOwned: 7,
      distanceInZoneMeters: 33_200,
      achievedAt: "2026-10-31T07:40:00Z",
    },
    {
      userId: "u-adv-7",
      alias: "creek.sub5",
      points: 74,
      cellsOwned: 4,
      distanceInZoneMeters: 25_000,
      achievedAt: "2026-10-29T19:00:00Z",
    },
  ],
  elite: [
    {
      userId: "u-elite-1",
      alias: "layla.fly",
      points: 198,
      cellsOwned: 22,
      distanceInZoneMeters: 72_500,
      achievedAt: "2026-11-06T06:15:00Z",
    },
    {
      userId: "u-elite-2",
      alias: "marathon.dxb",
      points: 186,
      cellsOwned: 19,
      distanceInZoneMeters: 68_100,
      achievedAt: "2026-11-05T06:30:00Z",
    },
    {
      userId: "u-elite-3",
      alias: "gulf.split",
      points: 174,
      cellsOwned: 16,
      distanceInZoneMeters: 63_400,
      achievedAt: "2026-11-04T18:00:00Z",
    },
    {
      userId: "u-elite-4",
      alias: "turbo.rashid",
      points: 158,
      cellsOwned: 13,
      distanceInZoneMeters: 57_000,
      achievedAt: "2026-11-03T07:15:00Z",
    },
    {
      userId: "u-elite-5",
      alias: "dxb.aerobic",
      points: 132,
      cellsOwned: 10,
      distanceInZoneMeters: 48_200,
      achievedAt: "2026-11-02T17:45:00Z",
    },
    {
      userId: "u-elite-6",
      alias: "sub4.beast",
      points: 108,
      cellsOwned: 8,
      distanceInZoneMeters: 39_000,
      achievedAt: "2026-10-31T06:00:00Z",
    },
  ],
};

/**
 * Returns realistic mock ranking data for any league.
 */
export function getMockLeagueRanking(league: LeagueCode): LeagueRankingData {
  const candidates = MOCK_ROSTERS[league] ?? [];
  const runners: RankedRunner[] = calculateRanking(candidates);
  const season = getMockSeason();

  return {
    league,
    season,
    runners,
  };
}
