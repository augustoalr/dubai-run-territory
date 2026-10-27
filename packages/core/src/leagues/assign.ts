import { LEAGUE_BANDS, type LeagueBand, type LeagueCode } from "./bands";

/** League for a reference pace. Bands are data, so they can move after season 1. */
export function assignLeague(
  paceSecondsPerKm: number,
  bands: readonly LeagueBand[] = LEAGUE_BANDS,
): LeagueCode {
  if (!Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm <= 0) {
    throw new Error("pace must be a positive number of seconds per kilometre");
  }
  const rounded = Math.round(paceSecondsPerKm);
  const match = bands.find((band) => {
    const aboveMin = band.minPaceS === null || rounded >= band.minPaceS;
    const belowMax = band.maxPaceS === null || rounded <= band.maxPaceS;
    return aboveMin && belowMax;
  });
  if (!match) throw new Error(`no league covers ${rounded} s/km`);
  return match.code;
}
