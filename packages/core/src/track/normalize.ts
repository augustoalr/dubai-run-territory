import { distanceToPolylineMeters, haversineMeters, pointInRing } from "../geo/measure";
import type { LngLat, PolygonGeometry } from "../geo/types";
import type { RawPoint, Sport } from "../parse/types";
import type { RunSource } from "../runs/source";
import { type AntiCheatConfig, resolveConfig } from "./config";

const DEFAULT_BUFFER_M = 30;

export type NormalizeResult = {
  points: RawPoint[];
  droppedSpikes: number;
};

export type NormalizedPoint = {
  t: number;
  lat: number;
  lon: number;
  ele?: number;
  cad?: number;
  hr?: number;
  /** Haversine metres from the start of this segment. Does not cross a split. */
  distanceM: number;
};

export type TrackSegment = {
  points: NormalizedPoint[];
  distanceM: number;
  startedAt: number;
  endedAt: number;
};

export type SplitKind = "gap" | "jump";

/**
 * Parsed activity after ordering, spike removal and the clip to the zone.
 * `source` is the caller's `RunSource` (`upload`, `garmin`, `polar` or `browser`).
 * A file exported from Strava and picked by the runner is still `upload`.
 */
export type NormalizedActivity = {
  source: RunSource;
  sport?: Sport;
  segments: TrackSegment[];
  splits: SplitKind[];
  startedAt: number | null;
  endedAt: number | null;
  distanceM: number;
  /** Timed points considered before spike removal. */
  inputPoints: number;
  droppedSpikes: number;
};

/**
 * Order by time, drop duplicate timestamps, and drop GPS spikes.
 *
 * A spike is one sample with a short fast leg on both sides (out and back).
 * A teleport is a single leg longer than `teleportM`: that point stays.
 * `clipToZone` splits there, so the rest of the run is not thrown away.
 */
export function normalize(
  points: readonly RawPoint[],
  options?: Partial<Pick<AntiCheatConfig, "maxSpeedMps" | "teleportM">>,
): NormalizeResult {
  const config = resolveConfig(options);
  return dropSpikes(dedupe(points), config.maxSpeedMps, config.teleportM);
}

/**
 * Keep points inside the zone polygon, plus `bufferM` (default 30).
 * Split when two kept points are more than 30 s apart or more than 100 m apart.
 * Each segment carries its own haversine distance, starting at 0.
 */
export function clipToZone(
  points: readonly RawPoint[],
  polygon: PolygonGeometry,
  bufferM = DEFAULT_BUFFER_M,
  options?: Partial<Pick<AntiCheatConfig, "gapMs" | "teleportM">>,
): TrackSegment[] {
  const config = resolveConfig(options);
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) return [];
  const holes = polygon.coordinates.slice(1);
  const inside = points.filter((point) => insideZone(point, ring, holes, bufferM));
  const segments: TrackSegment[] = [];
  let current: RawPoint[] = [];

  const flush = () => {
    if (current.length === 0) return;
    segments.push(toSegment(current));
    current = [];
  };

  for (const point of inside) {
    const previous = current[current.length - 1];
    if (previous && splitsFrom(previous, point, config.gapMs, config.teleportM)) flush();
    current.push(point);
  }
  flush();
  return segments;
}

export function normalizeActivity(input: {
  points: readonly RawPoint[];
  source: RunSource;
  sport?: Sport;
  polygon: PolygonGeometry;
  bufferM?: number;
  config?: Partial<AntiCheatConfig>;
}): NormalizedActivity {
  const config = resolveConfig(input.config);
  const normalized = normalize(input.points, config);
  const segments = clipToZone(
    normalized.points,
    input.polygon,
    input.bufferM ?? config.zoneBufferM,
    config,
  );
  const startedAt = segments[0]?.startedAt ?? null;
  const endedAt = segments[segments.length - 1]?.endedAt ?? null;
  const activity: NormalizedActivity = {
    source: input.source,
    segments,
    splits: splitsBetween(segments, config.gapMs, config.teleportM),
    startedAt,
    endedAt,
    distanceM: segments.reduce((total, segment) => total + segment.distanceM, 0),
    inputPoints: normalized.points.length + normalized.droppedSpikes,
    droppedSpikes: normalized.droppedSpikes,
  };
  if (input.sport) activity.sport = input.sport;
  return activity;
}

function dedupe(points: readonly RawPoint[]): RawPoint[] {
  const valid = points.filter(
    (point) => Number.isFinite(point.t) && Number.isFinite(point.lat) && Number.isFinite(point.lon),
  );
  valid.sort((a, b) => a.t - b.t || a.lat - b.lat || a.lon - b.lon);
  const kept: RawPoint[] = [];
  for (const point of valid) {
    const last = kept[kept.length - 1];
    if (last && last.t === point.t) continue;
    kept.push(point);
  }
  return kept;
}

function dropSpikes(
  points: readonly RawPoint[],
  maxSpeedMps: number,
  teleportM: number,
): NormalizeResult {
  if (points.length < 3) return { points: [...points], droppedSpikes: 0 };
  const drop = new Set<number>();
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    /* v8 ignore next -- noUncheckedIndexedAccess; the loop bounds already guarantee the trio */
    if (!previous || !current || !next) continue;
    const inbound = shortSpike(previous, current, maxSpeedMps, teleportM);
    const outbound = shortSpike(current, next, maxSpeedMps, teleportM);
    if (inbound && outbound) drop.add(index);
  }
  if (drop.size === 0) return { points: [...points], droppedSpikes: 0 };
  return {
    points: points.filter((_, index) => !drop.has(index)),
    droppedSpikes: drop.size,
  };
}

/** Faster than a run, and short enough that it is not its own segment. */
function shortSpike(from: RawPoint, to: RawPoint, maxSpeedMps: number, teleportM: number): boolean {
  const distance = haversineMeters([from.lon, from.lat], [to.lon, to.lat]);
  if (distance > teleportM) return false;
  const seconds = (to.t - from.t) / 1000;
  /* v8 ignore next -- duplicate timestamps are removed before this runs */
  if (seconds <= 0) return true;
  return distance / seconds > maxSpeedMps;
}

function splitsFrom(previous: RawPoint, next: RawPoint, gapMs: number, teleportM: number): boolean {
  if (next.t - previous.t > gapMs) return true;
  return haversineMeters([previous.lon, previous.lat], [next.lon, next.lat]) > teleportM;
}

function splitsBetween(
  segments: readonly TrackSegment[],
  gapMs: number,
  teleportM: number,
): SplitKind[] {
  const splits: SplitKind[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1]?.points.at(-1);
    const next = segments[index]?.points[0];
    /* v8 ignore next -- a segment is only stored when it has points */
    if (!previous || !next) continue;
    const distance = haversineMeters([previous.lon, previous.lat], [next.lon, next.lat]);
    if (distance > teleportM) splits.push("jump");
    else if (next.t - previous.t > gapMs) splits.push("gap");
  }
  return splits;
}

function toSegment(points: readonly RawPoint[]): TrackSegment {
  let distance = 0;
  const normalized: NormalizedPoint[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const previous = points[index - 1];
    /* v8 ignore next -- the index is inside the array */
    if (!point) continue;
    if (previous) {
      distance += haversineMeters([previous.lon, previous.lat], [point.lon, point.lat]);
    }
    normalized.push(copyPoint(point, distance));
  }
  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  /* v8 ignore next -- flush never builds a segment from an empty list */
  if (!first || !last) return { points: [], distanceM: 0, startedAt: 0, endedAt: 0 };
  return { points: normalized, distanceM: last.distanceM, startedAt: first.t, endedAt: last.t };
}

function copyPoint(point: RawPoint, distanceM: number): NormalizedPoint {
  const next: NormalizedPoint = { t: point.t, lat: point.lat, lon: point.lon, distanceM };
  if (point.ele !== undefined) next.ele = point.ele;
  if (point.cad !== undefined) next.cad = point.cad;
  if (point.hr !== undefined) next.hr = point.hr;
  return next;
}

function insideZone(
  point: RawPoint,
  ring: readonly LngLat[],
  holes: readonly (readonly LngLat[])[],
  bufferM: number,
): boolean {
  const here: LngLat = [point.lon, point.lat];
  if (pointInRing(here, ring)) {
    return !holes.some(
      (hole) => pointInRing(here, hole) && distanceToPolylineMeters(here, hole) > bufferM,
    );
  }
  return distanceToPolylineMeters(here, ring) <= bufferM;
}
