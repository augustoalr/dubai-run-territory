/**
 * Ranking domain types for league seasonal leaderboards (PRODUCTO §3.8, T-17).
 */

export interface RankingCandidate {
  userId: string;
  points: number;
  cellsOwned: number;
  distanceInZoneMeters: number;
  achievedAt: string | number | Date;
  alias?: string | null;
}

export interface RankedRunner {
  /** Sporting competition rank (1, 2, 3... ties share the same rank). */
  rank: number;
  /** Sequential list position (1, 2, 3...). */
  position: number;
  userId: string;
  alias?: string | null;
  points: number;
  cellsOwned: number;
  distanceInZoneMeters: number;
  distanceInZoneKm: number;
  achievedAt: string;
}

export interface RankingDailyPoint {
  userId: string;
  points: number;
  day: string;
  cellsOwned?: number;
}

export interface RankingCellOwnership {
  ownerId: string;
  h3?: string;
}

export interface RankingValidRun {
  userId: string;
  distanceInZoneMeters: number;
  endedAt?: string | null;
}

export interface RankingProfile {
  id: string;
  alias?: string | null;
}

export interface AggregateRankingInput {
  dailyPoints: readonly RankingDailyPoint[];
  cellOwnerships?: readonly RankingCellOwnership[];
  validRuns?: readonly RankingValidRun[];
  profiles?: readonly RankingProfile[];
  seasonStartsAt?: string | number | Date;
}
