import type { RankingCandidate } from "./types";

/**
 * Safely normalizes any timestamp-like value (ISO string, Date, or ms number)
 * into a unix millisecond epoch timestamp.
 */
export function normalizeTimestamp(value: string | number | Date | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Checks whether two ranking candidates are completely identical across
 * all 4 official competition ranking and tiebreak criteria:
 * 1. Points
 * 2. Cells owned
 * 3. Distance in zone
 * 4. Timestamp achieved
 */
export function areCriteriaEqual(a: RankingCandidate, b: RankingCandidate): boolean {
  return (
    a.points === b.points &&
    a.cellsOwned === b.cellsOwned &&
    a.distanceInZoneMeters === b.distanceInZoneMeters &&
    normalizeTimestamp(a.achievedAt) === normalizeTimestamp(b.achievedAt)
  );
}

/**
 * Comparator for ranking candidates following the official rules (PRODUCTO §3.8):
 *
 * 1. Total points accumulated in the season (`daily_points.points`) — DESCENDING.
 * 2. Tiebreaker 1: Cells owned at closing/current (`cell_ownership`) — DESCENDING.
 * 3. Tiebreaker 2: Distance accumulated in valid runs inside the zone — DESCENDING.
 * 4. Tiebreaker 3: Seniority (who reached the score first) — ASCENDING (earlier timestamp).
 * 5. Deterministic fallback: userId — ASCENDING.
 */
export function compareRankingCandidates(a: RankingCandidate, b: RankingCandidate): number {
  // Criterion 1: Total accumulated points (higher is better)
  if (b.points !== a.points) {
    return b.points - a.points;
  }

  // Tiebreaker 1: Cells owned (more is better)
  if (b.cellsOwned !== a.cellsOwned) {
    return b.cellsOwned - a.cellsOwned;
  }

  // Tiebreaker 2: Kilometers accumulated in valid runs in zone (more is better)
  if (b.distanceInZoneMeters !== a.distanceInZoneMeters) {
    return b.distanceInZoneMeters - a.distanceInZoneMeters;
  }

  // Tiebreaker 3: Seniority (who reached that score first, earlier is better)
  const timeA = normalizeTimestamp(a.achievedAt);
  const timeB = normalizeTimestamp(b.achievedAt);
  if (timeA !== timeB) {
    return timeA - timeB;
  }

  // Deterministic tiebreak on userId
  return a.userId.localeCompare(b.userId);
}
