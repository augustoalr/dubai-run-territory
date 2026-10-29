import type { Sport } from "../parse/types";
import type { RunSource } from "../runs/source";
import { type AntiCheatConfig, resolveConfig } from "./config";
import { fastestWindowSeconds } from "./compute";
import { trackHash } from "./hash";
import type { NormalizedActivity, SplitKind, TrackSegment } from "./normalize";

export type RunStatus = "accepted" | "review" | "rejected";

export const REASON = {
  NO_TIMESTAMPS: "NO_TIMESTAMPS",
  NOT_RUNNING: "NOT_RUNNING",
  OUT_OF_WINDOW: "OUT_OF_WINDOW",
  LOW_DENSITY: "LOW_DENSITY",
  GPS_SPIKES: "GPS_SPIKES",
  TOO_SHORT: "TOO_SHORT",
  DUPLICATE: "DUPLICATE",
  COPIED_TRACK: "COPIED_TRACK",
  RATE_LIMIT: "RATE_LIMIT",
  IMPOSSIBLE_PACE: "IMPOSSIBLE_PACE",
  BIKE_PATTERN: "BIKE_PATTERN",
  CADENCE: "CADENCE",
} as const;

export type ReasonCode = (typeof REASON)[keyof typeof REASON];

export type RunFlag = "JUMP" | "GAP" | "SPIKE";

export type PriorRun = {
  startedAt: number;
  endedAt: number;
};

export type KnownTrack = {
  trackHash: string;
  userId: string;
};

export type SeasonWindow = {
  startsAt: number;
  endsAt: number;
};

/**
 * Facts that live in the database. Tests pass mocks; the Edge Function will too.
 * `season` is optional until the caller has one: without it that check is skipped.
 * The file hash travels on `RunMeta`, not here, so a mock can omit the upload bytes.
 */
export type CheckContext = {
  now: number;
  uploadedAt?: number;
  userId: string;
  ownFileHashes: readonly string[];
  ownRuns: readonly PriorRun[];
  knownTracks: readonly KnownTrack[];
  runsToday: number;
  season?: SeasonWindow;
};

export type RunMeta = {
  source: RunSource;
  sport?: Sport;
  fileSha256: string;
  droppedSpikes: number;
  inputPoints: number;
  startedAt: number | null;
  endedAt: number | null;
  splits: readonly SplitKind[];
};

export type CheckResult = {
  status: RunStatus;
  reason: ReasonCode | null;
  flags: RunFlag[];
  trackHash: string;
  source: RunSource;
};

/**
 * Anti-cheat (ARQUITECTURA §6). Rejections win over review, and review wins over `TOO_SHORT`.
 * A teleport or a pause is only a split: it does not reject the run.
 * Cells are counted by the caller only when the result is `accepted` with no reason.
 */
export async function checkRun(
  meta: RunMeta,
  segments: readonly TrackSegment[],
  context: CheckContext,
  config?: Partial<AntiCheatConfig>,
): Promise<CheckResult> {
  const rules = resolveConfig(config);
  const hash = await trackHash(activityFrom(meta, segments));
  const reason = firstReason(meta, segments, context, rules, hash);
  return {
    status: statusFor(reason),
    reason,
    flags: flagsFor(meta),
    trackHash: hash,
    source: meta.source,
  };
}

function activityFrom(meta: RunMeta, segments: readonly TrackSegment[]): NormalizedActivity {
  const activity: NormalizedActivity = {
    source: meta.source,
    segments: [...segments],
    splits: [...meta.splits],
    startedAt: meta.startedAt,
    endedAt: meta.endedAt,
    distanceM: segments.reduce((total, segment) => total + segment.distanceM, 0),
    inputPoints: meta.inputPoints,
    droppedSpikes: meta.droppedSpikes,
  };
  if (meta.sport) activity.sport = meta.sport;
  return activity;
}

function firstReason(
  meta: RunMeta,
  segments: readonly TrackSegment[],
  context: CheckContext,
  rules: AntiCheatConfig,
  hash: string,
): ReasonCode | null {
  if (meta.inputPoints === 0) return REASON.NO_TIMESTAMPS;
  if (meta.sport === "cycling") return REASON.NOT_RUNNING;
  if (outOfWindow(meta, segments, context, rules)) return REASON.OUT_OF_WINDOW;
  if (duplicate(meta, context)) return REASON.DUPLICATE;
  if (context.runsToday >= rules.maxRunsPerDay) return REASON.RATE_LIMIT;
  if (lowDensity(segments, rules)) return REASON.LOW_DENSITY;
  if (meta.inputPoints > 0 && meta.droppedSpikes / meta.inputPoints > rules.maxSpikeFraction) {
    return REASON.GPS_SPIKES;
  }
  if (copied(hash, context)) return REASON.COPIED_TRACK;
  if (impossiblePace(segments, rules)) return REASON.IMPOSSIBLE_PACE;
  if (bikePattern(segments, rules)) return REASON.BIKE_PATTERN;
  if (cadenceOutOfRange(segments, rules)) return REASON.CADENCE;
  if (longestSegment(segments) < rules.minContinuousM) return REASON.TOO_SHORT;
  return null;
}

function statusFor(reason: ReasonCode | null): RunStatus {
  if (
    reason === REASON.COPIED_TRACK ||
    reason === REASON.IMPOSSIBLE_PACE ||
    reason === REASON.BIKE_PATTERN ||
    reason === REASON.CADENCE
  ) {
    return "review";
  }
  if (reason === null || reason === REASON.TOO_SHORT) return "accepted";
  return "rejected";
}

function flagsFor(meta: RunMeta): RunFlag[] {
  const flags: RunFlag[] = [];
  if (meta.droppedSpikes > 0) flags.push("SPIKE");
  if (meta.splits.includes("jump")) flags.push("JUMP");
  if (meta.splits.includes("gap")) flags.push("GAP");
  return flags;
}

function outOfWindow(
  meta: RunMeta,
  segments: readonly TrackSegment[],
  context: CheckContext,
  rules: AntiCheatConfig,
): boolean {
  for (const segment of segments) {
    for (const point of segment.points) {
      if (point.t > context.now) return true;
    }
  }
  if (meta.startedAt !== null && meta.startedAt > context.now) return true;
  const uploadedAt = context.uploadedAt ?? context.now;
  if (meta.endedAt !== null && uploadedAt - meta.endedAt > rules.uploadWindowMs) return true;
  const season = context.season;
  if (!season || meta.startedAt === null) return false;
  return meta.startedAt < season.startsAt || meta.startedAt > season.endsAt;
}

function duplicate(meta: RunMeta, context: CheckContext): boolean {
  if (context.ownFileHashes.includes(meta.fileSha256)) return true;
  const startedAt = meta.startedAt;
  const endedAt = meta.endedAt;
  if (startedAt === null || endedAt === null) return false;
  return context.ownRuns.some((run) => startedAt < run.endedAt && endedAt > run.startedAt);
}

function lowDensity(segments: readonly TrackSegment[], rules: AntiCheatConfig): boolean {
  let gaps = 0;
  let total = 0;
  for (const segment of segments) {
    for (let index = 1; index < segment.points.length; index += 1) {
      const previous = segment.points[index - 1];
      const current = segment.points[index];
      if (!previous || !current) continue;
      const dt = current.t - previous.t;
      if (dt <= 0) continue;
      gaps += 1;
      total += dt;
    }
  }
  if (gaps === 0) return false;
  return total / gaps > rules.maxMeanIntervalMs;
}

function copied(hash: string, context: CheckContext): boolean {
  return context.knownTracks.some(
    (track) => track.trackHash === hash && track.userId !== context.userId,
  );
}

function impossiblePace(segments: readonly TrackSegment[], rules: AntiCheatConfig): boolean {
  const fastest = fastestWindowSeconds(segments);
  return fastest !== null && fastest < rules.impossiblePaceS;
}

function bikePattern(segments: readonly TrackSegment[], rules: AntiCheatConfig): boolean {
  const speeds = stepSpeeds(segments);
  if (speeds.length === 0) return false;
  const speed = median(speeds);
  if (speed > rules.bikeMedianSpeedMps && coefficientOfVariation(speeds) <= rules.maxBikeSpeedCv) {
    return true;
  }
  const cadence = cadenceValues(segments);
  if (cadence.length === 0) return false;
  return speed > rules.bikeCadenceSpeedMps && median(cadence) < rules.bikeCadenceSpm;
}

function cadenceOutOfRange(segments: readonly TrackSegment[], rules: AntiCheatConfig): boolean {
  const cadence = cadenceValues(segments);
  const speeds = stepSpeeds(segments);
  if (cadence.length === 0 || speeds.length === 0) return false;
  if (median(speeds) <= rules.cadenceFastSpeedMps) return false;
  const value = median(cadence);
  return value < rules.cadenceMinSpm || value > rules.cadenceMaxSpm;
}

function longestSegment(segments: readonly TrackSegment[]): number {
  return segments.reduce((best, segment) => Math.max(best, segment.distanceM), 0);
}

function stepSpeeds(segments: readonly TrackSegment[]): number[] {
  const speeds: number[] = [];
  for (const segment of segments) {
    for (let index = 1; index < segment.points.length; index += 1) {
      const previous = segment.points[index - 1];
      const current = segment.points[index];
      if (!previous || !current) continue;
      const seconds = (current.t - previous.t) / 1000;
      if (seconds <= 0) continue;
      speeds.push((current.distanceM - previous.distanceM) / seconds);
    }
  }
  return speeds;
}

function cadenceValues(segments: readonly TrackSegment[]): number[] {
  const values: number[] = [];
  for (const segment of segments) {
    for (const point of segment.points) {
      if (point.cad !== undefined) values.push(point.cad);
    }
  }
  return values;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid];
  if (upper === undefined) return 0;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[mid - 1];
  return lower === undefined ? upper : (lower + upper) / 2;
}

function coefficientOfVariation(values: readonly number[]): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  if (mean <= 0) return Number.POSITIVE_INFINITY;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}
