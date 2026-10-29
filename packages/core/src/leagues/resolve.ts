import { assignLeague } from "./assign";
import { LEAGUE_BANDS, type LeagueBand, type LeagueCode } from "./bands";

export type LeagueReason = "provisional" | "promotion" | "held" | "season_start";

export type LeagueDecision = {
  league: LeagueCode;
  reason: LeagueReason;
};

/**
 * League for this run (PRODUCTO §3.7).
 *
 * - No current league: provisional, from this run's best 1 km.
 * - Mid-season: promote immediately when this run is faster than the current
 *   league's fast edge. A slower run does not demote.
 * - Season start (`seasonStart`): assign from the 60-day reference pace, which
 *   may be a demotion. The caller includes this run in that reference.
 */
export function resolveLeagueForRun(
  current: LeagueCode | null,
  runBestPaceS: number,
  bands: readonly LeagueBand[] = LEAGUE_BANDS,
  options?: { seasonStart?: boolean; referencePaceS?: number | null },
): LeagueDecision {
  if (options?.seasonStart) {
    const pace = options.referencePaceS ?? runBestPaceS;
    return { league: assignLeague(pace, bands), reason: "season_start" };
  }
  const shown = assignLeague(runBestPaceS, bands);
  if (current === null) return { league: shown, reason: "provisional" };
  if (sortOf(shown, bands) < sortOf(current, bands)) {
    return { league: shown, reason: "promotion" };
  }
  return { league: current, reason: "held" };
}

function sortOf(code: LeagueCode, bands: readonly LeagueBand[]): number {
  const band = bands.find((item) => item.code === code);
  if (!band) throw new Error(`unknown league ${code}`);
  return band.sort;
}
