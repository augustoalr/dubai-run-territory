import type { CellEffort } from "../efforts/cell-effort";
import type { PolygonGeometry } from "../geo/types";
import type { ParseErrorCode } from "../parse/errors";
import type { RawPoint, Sport } from "../parse/types";
import { LEAGUE_BANDS, type LeagueBand, type LeagueCode } from "../leagues/bands";
import type { LeagueReason } from "../leagues/resolve";
import { resolveLeagueForRun } from "../leagues/resolve";
import { REFERENCE_WINDOW_MS, referencePaceS } from "../leagues/reference";
import { bestKmWindow } from "../leagues/window";
import type { RunSource } from "./source";
import { assessRun } from "../track/assess";
import type { CheckContext, PriorRun, ReasonCode, RunFlag, RunStatus } from "../track/check";

const GULF = "Asia/Dubai";

/** One of the caller's earlier runs, already loaded from the database. */
export type HistoryRun = {
  fileSha256: string;
  startedAt: number | null;
  endedAt: number | null;
  createdAt: number;
  /** Best stored 1 km, when the run produced cell marks. */
  bestPaceS: number | null;
};

export type HistoryContext = {
  ownFileHashes: string[];
  ownRuns: PriorRun[];
  runsToday: number;
  referencePaceS: number | null;
};

/**
 * Anti-cheat facts from the runner's last 60 days.
 * `knownTracks` stays empty: other people's tracks are not loaded here.
 * `runsToday` counts the Gulf day of the start (or of the upload, if there is no start).
 */
export function historyContext(runs: readonly HistoryRun[], now: number): HistoryContext {
  const oldest = now - REFERENCE_WINDOW_MS;
  const today = gulfDayKey(now);
  const recent = runs.filter((run) => {
    const at = run.startedAt ?? run.createdAt;
    return at >= oldest && at <= now;
  });
  const ownRuns: PriorRun[] = [];
  const paces: { at: number; paceS: number }[] = [];
  let runsToday = 0;
  for (const run of recent) {
    const at = run.startedAt ?? run.createdAt;
    if (gulfDayKey(at) === today) runsToday += 1;
    if (run.startedAt !== null && run.endedAt !== null) {
      ownRuns.push({ startedAt: run.startedAt, endedAt: run.endedAt });
    }
    if (run.bestPaceS !== null && run.bestPaceS > 0) paces.push({ at, paceS: run.bestPaceS });
  }
  return {
    ownFileHashes: recent.map((run) => run.fileSha256),
    ownRuns,
    runsToday,
    referencePaceS: referencePaceS(paces, now),
  };
}

function gulfDayKey(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GULF,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/**
 * What the Edge Function should write. No database and no Storage.
 * `apply` is true only when the run is accepted and has cell marks.
 * A review or a rejection is stored on the row and does not call `apply_run`.
 */
export type RunPlan = {
  status: RunStatus;
  rejectCode: ReasonCode | null;
  flags: RunFlag[];
  league: LeagueCode | null;
  leagueReason: LeagueReason | null;
  refPaceS: number | null;
  efforts: CellEffort[];
  apply: boolean;
  trackHash: string | null;
};

export async function planRun(input: {
  points: readonly RawPoint[];
  source: RunSource;
  sport?: Sport;
  polygon: PolygonGeometry;
  zoneCells: readonly string[];
  resolution: number;
  fileSha256: string;
  context: CheckContext;
  currentLeague: LeagueCode | null;
  parseError?: ParseErrorCode | null;
  seasonStart?: boolean;
  referencePaceS?: number | null;
  bands?: readonly LeagueBand[];
}): Promise<RunPlan> {
  const bands = input.bands ?? LEAGUE_BANDS;
  const assessment = await assessRun({
    points: input.points,
    source: input.source,
    sport: input.sport,
    polygon: input.polygon,
    zoneCells: input.zoneCells,
    resolution: input.resolution,
    fileSha256: input.fileSha256,
    context: input.context,
    parseError: input.parseError,
  });

  const refPaceS = assessment.activity ? bestKmWindow(assessment.activity.segments) : null;
  const leagueDecision =
    refPaceS === null
      ? null
      : resolveLeagueForRun(input.currentLeague, refPaceS, bands, {
          seasonStart: input.seasonStart,
          referencePaceS: input.referencePaceS,
        });

  const accepted = assessment.status === "accepted" && assessment.reason === null;
  return {
    status: assessment.status,
    rejectCode: assessment.reason,
    flags: assessment.flags,
    league: leagueDecision?.league ?? input.currentLeague,
    leagueReason: leagueDecision?.reason ?? null,
    refPaceS,
    efforts: accepted ? assessment.efforts : [],
    apply: accepted && assessment.efforts.length > 0,
    trackHash: assessment.trackHash,
  };
}
