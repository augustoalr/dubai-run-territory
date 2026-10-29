import type { CellEffort } from "../efforts/cell-effort";
import type { PolygonGeometry } from "../geo/types";
import type { ParseErrorCode } from "../parse/errors";
import type { RawPoint, Sport } from "../parse/types";
import { LEAGUE_BANDS, type LeagueBand, type LeagueCode } from "../leagues/bands";
import type { LeagueReason } from "../leagues/resolve";
import { resolveLeagueForRun } from "../leagues/resolve";
import { bestKmWindow } from "../leagues/window";
import type { RunSource } from "./source";
import { assessRun } from "../track/assess";
import type { CheckContext, ReasonCode, RunFlag, RunStatus } from "../track/check";

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
