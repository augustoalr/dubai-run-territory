import type { CellEffort } from "../efforts/cell-effort";
import type { PolygonGeometry } from "../geo/types";
import type { ParseErrorCode } from "../parse/errors";
import type { RawPoint, Sport } from "../parse/types";
import type { RunSource } from "../runs/source";
import {
  checkRun,
  type CheckContext,
  type ReasonCode,
  type RunFlag,
  type RunStatus,
} from "./check";
import type { AntiCheatConfig } from "./config";
import { computeCellEfforts } from "./compute";
import { normalizeActivity, type NormalizedActivity } from "./normalize";

export type Assessment = {
  status: RunStatus;
  reason: ReasonCode | null;
  approxCells: number;
  efforts: CellEffort[];
  activity: NormalizedActivity | null;
  trackHash: string | null;
  flags: RunFlag[];
  source: RunSource;
};

/**
 * Parse result → normalised activity → cell efforts → anti-cheat.
 * This is the result described by each fixture JSON.
 * A file that does not parse does not score cells.
 */
export async function assessRun(input: {
  points: readonly RawPoint[];
  source: RunSource;
  sport?: Sport;
  polygon: PolygonGeometry;
  zoneCells: readonly string[];
  resolution: number;
  fileSha256: string;
  context: CheckContext;
  parseError?: ParseErrorCode | null;
  config?: Partial<AntiCheatConfig>;
}): Promise<Assessment> {
  if (input.parseError) {
    return {
      status: "rejected",
      reason: "NO_TIMESTAMPS",
      approxCells: 0,
      efforts: [],
      activity: null,
      trackHash: null,
      flags: [],
      source: input.source,
    };
  }

  const activity = normalizeActivity({
    points: input.points,
    source: input.source,
    sport: input.sport,
    polygon: input.polygon,
    config: input.config,
  });
  const efforts = computeCellEfforts(activity.segments, input.resolution, input.zoneCells);
  const decision = await checkRun(
    {
      source: activity.source,
      sport: activity.sport,
      fileSha256: input.fileSha256,
      droppedSpikes: activity.droppedSpikes,
      inputPoints: activity.inputPoints,
      startedAt: activity.startedAt,
      endedAt: activity.endedAt,
      splits: activity.splits,
    },
    activity.segments,
    input.context,
    input.config,
  );
  const scores = decision.status === "accepted" && decision.reason === null;
  return {
    status: decision.status,
    reason: decision.reason,
    approxCells: scores ? efforts.length : 0,
    efforts,
    activity,
    trackHash: decision.trackHash,
    flags: decision.flags,
    source: decision.source,
  };
}
