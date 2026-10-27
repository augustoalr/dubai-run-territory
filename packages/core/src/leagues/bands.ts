/**
 * Pace bands from PRODUCTO §3.7. Values are seconds per kilometre.
 * The edges are estimates until season 1 is calibrated.
 * 4:15/km = 255, 5:15/km = 315, 6:15/km = 375.
 */
export type LeagueCode = "elite" | "advanced" | "intermediate" | "starter";

export type LeagueBand = {
  code: LeagueCode;
  sort: number;
  /** Inclusive. Null means there is no slower bound. */
  minPaceS: number | null;
  /** Inclusive. Null means there is no faster bound. */
  maxPaceS: number | null;
};

export const LEAGUE_BANDS: readonly LeagueBand[] = [
  { code: "elite", sort: 0, minPaceS: null, maxPaceS: 254 },
  { code: "advanced", sort: 1, minPaceS: 255, maxPaceS: 314 },
  { code: "intermediate", sort: 2, minPaceS: 315, maxPaceS: 374 },
  { code: "starter", sort: 3, minPaceS: 375, maxPaceS: null },
];

export const LEAGUE_CODES: readonly LeagueCode[] = LEAGUE_BANDS.map((band) => band.code);
