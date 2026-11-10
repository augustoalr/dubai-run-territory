import { areCriteriaEqual, compareRankingCandidates, normalizeTimestamp } from "./compare";
import type { AggregateRankingInput, RankedRunner, RankingCandidate } from "./types";

/**
 * Calculates and orders a league seasonal leaderboard given a list of ranking candidates.
 * Applies the 4 official sporting criteria in order (points, owned cells, distance in zone, seniority).
 * Assigns competition ranks (ties share rank) and sequential positions.
 *
 * Immutable by default: does not mutate the input array.
 */
export function calculateRanking(candidates: readonly RankingCandidate[]): RankedRunner[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  // Clone and sort deterministically
  const sorted = [...candidates].sort(compareRankingCandidates);

  const result: RankedRunner[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const candidate = sorted[index];
    if (!candidate) continue;

    const distanceMeters = Math.max(0, candidate.distanceInZoneMeters || 0);
    const distanceKm = Number((distanceMeters / 1000).toFixed(2));
    const normalizedTime = normalizeTimestamp(candidate.achievedAt);
    const achievedAtIso = new Date(normalizedTime).toISOString();

    let rank = index + 1;
    const prevCandidate = index > 0 ? sorted[index - 1] : undefined;
    const prevResult = index > 0 ? result[index - 1] : undefined;
    if (prevCandidate && prevResult && areCriteriaEqual(candidate, prevCandidate)) {
      rank = prevResult.rank;
    }

    result.push({
      rank,
      position: index + 1,
      userId: candidate.userId,
      alias: candidate.alias ?? null,
      points: Math.max(0, candidate.points || 0),
      cellsOwned: Math.max(0, candidate.cellsOwned || 0),
      distanceInZoneMeters: distanceMeters,
      distanceInZoneKm: distanceKm,
      achievedAt: achievedAtIso,
    });
  }

  return result;
}

/**
 * Aggregates raw daily points, cell ownership, and valid runs into a complete,
 * ordered seasonal ranking for a league.
 */
export function aggregateRankingData(input: AggregateRankingInput): RankedRunner[] {
  const {
    dailyPoints = [],
    cellOwnerships = [],
    validRuns = [],
    profiles = [],
    seasonStartsAt,
  } = input;

  const defaultStartTime = seasonStartsAt ? normalizeTimestamp(seasonStartsAt) : 0;
  const userIds = new Set<string>();

  // 1. Group daily points by user
  type UserPointsAccumulator = {
    totalPoints: number;
    days: Array<{ day: string; points: number }>;
  };
  const pointsByUser = new Map<string, UserPointsAccumulator>();

  for (const dp of dailyPoints) {
    if (!dp.userId) continue;
    userIds.add(dp.userId);

    const existing = pointsByUser.get(dp.userId) ?? { totalPoints: 0, days: [] };
    existing.totalPoints += Math.max(0, dp.points);
    existing.days.push({ day: dp.day, points: Math.max(0, dp.points) });
    pointsByUser.set(dp.userId, existing);
  }

  // 2. Count owned cells by user
  const cellsByUser = new Map<string, number>();
  for (const co of cellOwnerships) {
    if (!co.ownerId) continue;
    userIds.add(co.ownerId);
    const current = cellsByUser.get(co.ownerId) ?? 0;
    cellsByUser.set(co.ownerId, current + 1);
  }

  // 3. Sum distance in zone by user
  const distanceByUser = new Map<string, number>();
  for (const run of validRuns) {
    if (!run.userId) continue;
    userIds.add(run.userId);
    const current = distanceByUser.get(run.userId) ?? 0;
    distanceByUser.set(run.userId, current + Math.max(0, run.distanceInZoneMeters));
  }

  // 4. Map profiles
  const aliasByUser = new Map<string, string | null>();
  for (const profile of profiles) {
    if (!profile.id) continue;
    aliasByUser.set(profile.id, profile.alias ?? null);
  }

  // 5. Build candidates
  const candidates: RankingCandidate[] = [];

  for (const userId of userIds) {
    const pointsData = pointsByUser.get(userId);
    const totalPoints = pointsData ? pointsData.totalPoints : 0;
    const cellsOwned = cellsByUser.get(userId) ?? 0;
    const distanceInZoneMeters = distanceByUser.get(userId) ?? 0;
    const alias = aliasByUser.get(userId) ?? null;

    let achievedAtTime = defaultStartTime;

    if (pointsData && pointsData.days.length > 0 && totalPoints > 0) {
      // Sort days chronologically to find the exact day user reached their final points total
      const sortedDays = [...pointsData.days].sort(
        (a, b) => normalizeTimestamp(a.day) - normalizeTimestamp(b.day),
      );

      // Find the last day where user earned positive points
      for (let i = sortedDays.length - 1; i >= 0; i -= 1) {
        const item = sortedDays[i];
        if (item && item.points > 0) {
          achievedAtTime = normalizeTimestamp(item.day);
          break;
        }
      }
    }

    candidates.push({
      userId,
      points: totalPoints,
      cellsOwned,
      distanceInZoneMeters,
      achievedAt: achievedAtTime,
      alias,
    });
  }

  return calculateRanking(candidates);
}
