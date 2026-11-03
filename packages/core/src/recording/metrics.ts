import { formatPace } from "../format/pace";
import { haversineMeters } from "../geo/measure";
import type { LiveRecordingStats, RecordedPoint } from "./types";

const MIN_SPEED_MPS = 0.5; // ~1.8 km/h; below this is treated as stationary
const MAX_PACE_SECONDS_PER_KM = 1800; // 30:00 /km
const MIN_PACE_SECONDS_PER_KM = 120; // 2:00 /km

/**
 * Calculates elapsed duration in whole seconds between two millisecond timestamps.
 * Guarantees a non-negative integer.
 */
export function calculateDurationSeconds(startTimeMs: number, endTimeMs: number): number {
  if (!Number.isFinite(startTimeMs) || !Number.isFinite(endTimeMs)) {
    return 0;
  }
  return Math.max(0, Math.floor((endTimeMs - startTimeMs) / 1000));
}

/**
 * Calculates cumulative haversine distance along a sequence of points in metres.
 * Ignores movements smaller than the GPS error margin (accuracy) to prevent jitter drift,
 * and skips segments with impossible speeds (> 25 km/h).
 */
export function calculateDistanceMeters(
  points: readonly RecordedPoint[],
  options?: { maxSpeedMps?: number },
): number {
  if (points.length < 2) {
    return 0;
  }

  let totalMeters = 0;
  let anchor = points[0]!;

  for (let i = 1; i < points.length; i += 1) {
    const curr = points[i]!;

    if (options?.maxSpeedMps !== undefined) {
      const legElapsedSec = (curr.time - anchor.time) / 1000;
      const legDist = haversineMeters([anchor.lon, anchor.lat], [curr.lon, curr.lat]);
      if (legElapsedSec > 0 && legDist / legElapsedSec > options.maxSpeedMps) {
        continue;
      }
    }

    const legDist = haversineMeters([anchor.lon, anchor.lat], [curr.lon, curr.lat]);
    const accuracyThreshold =
      curr.accuracy !== undefined && Number.isFinite(curr.accuracy) && curr.accuracy > 0
        ? curr.accuracy
        : 0;

    if (legDist >= accuracyThreshold) {
      totalMeters += legDist;
      anchor = curr;
    }
  }

  return totalMeters;
}

/**
 * Calculates current pace (in seconds per km) using a moving average over recent points
 * within a rolling time window (default 20 seconds, between 15 and 20 s).
 *
 * Rules:
 * 1. If in the last 10 seconds the net advance is less than 5 metres (stationary/quieto), returns null (displays "--").
 * 2. Movements smaller than the GPS error margin (accuracy) are ignored.
 * 3. Uses moving average of the last 15-20 seconds, not point-to-point.
 * 4. Returns null if stationary or insufficient data.
 */
export function calculateCurrentPaceSecondsPerKm(
  points: readonly RecordedPoint[],
  windowDurationMs = 20_000,
): number | null {
  if (points.length < 2) {
    return null;
  }

  const lastPoint = points[points.length - 1];
  if (!lastPoint) return null;

  // 1. Stillness check: if in the last 10 seconds the net advance is < 5 m, the runner is stationary
  const tenSecondsAgo = lastPoint.time - 10_000;
  let tenSecStartIndex = points.length - 1;
  while (tenSecStartIndex > 0 && points[tenSecStartIndex - 1]!.time >= tenSecondsAgo) {
    tenSecStartIndex -= 1;
  }
  const tenSecStartPoint = points[tenSecStartIndex]!;

  const advanceLast10s = haversineMeters(
    [tenSecStartPoint.lon, tenSecStartPoint.lat],
    [lastPoint.lon, lastPoint.lat],
  );
  if (advanceLast10s < 5) {
    return null;
  }

  const distanceLast10s = calculateDistanceMeters(points.slice(tenSecStartIndex));
  if (distanceLast10s < 5) {
    return null;
  }

  // 2. Rolling window of the last 15 to 20 seconds (default 20_000 ms)
  const windowStartTime = lastPoint.time - windowDurationMs;
  let windowStartIndex = points.length - 1;

  while (windowStartIndex > 0 && points[windowStartIndex - 1]!.time >= windowStartTime) {
    windowStartIndex -= 1;
  }

  const windowPoints = points.slice(windowStartIndex);
  if (windowPoints.length < 2) {
    return null;
  }

  const firstPoint = windowPoints[0]!;
  const elapsedSeconds = (lastPoint.time - firstPoint.time) / 1000;
  if (elapsedSeconds <= 0) {
    return null;
  }

  const windowDistanceMeters = calculateDistanceMeters(windowPoints);
  if (windowDistanceMeters < 5) {
    return null;
  }

  const speedMps = windowDistanceMeters / elapsedSeconds;
  if (speedMps < MIN_SPEED_MPS) {
    return null;
  }

  const paceSecondsPerKm = (elapsedSeconds / windowDistanceMeters) * 1000;
  if (paceSecondsPerKm < MIN_PACE_SECONDS_PER_KM || paceSecondsPerKm > MAX_PACE_SECONDS_PER_KM) {
    return null;
  }

  return Math.round(paceSecondsPerKm);
}

/**
 * Calculates current speed in km/h from recent points using the smoothed moving average.
 * Returns null if stationary or insufficient data.
 */
export function calculateCurrentSpeedKmh(
  points: readonly RecordedPoint[],
  windowDurationMs = 20_000,
): number | null {
  const pace = calculateCurrentPaceSecondsPerKm(points, windowDurationMs);
  if (pace === null || pace <= 0) {
    return null;
  }
  const speedKmh = 3600 / pace;
  return Math.round(speedKmh * 10) / 10;
}

/**
 * Calculates average pace in seconds per kilometre across the entire run.
 * Returns null if distance is negligible (< 10 m) or duration is 0.
 */
export function calculateAveragePaceSecondsPerKm(
  distanceMeters: number,
  durationSeconds: number,
): number | null {
  if (distanceMeters < 10 || durationSeconds <= 0) {
    return null;
  }
  const pace = (durationSeconds / distanceMeters) * 1000;
  return Math.round(pace);
}

/**
 * Calculates a complete LiveRecordingStats snapshot from recorded points and duration.
 */
export function computeRecordingStats(
  points: readonly RecordedPoint[],
  durationSeconds: number,
): LiveRecordingStats {
  const distanceMeters = calculateDistanceMeters(points);
  const currentPaceSecondsPerKm = calculateCurrentPaceSecondsPerKm(points);
  const currentSpeedKmh = calculateCurrentSpeedKmh(points);
  const averagePaceSecondsPerKm = calculateAveragePaceSecondsPerKm(distanceMeters, durationSeconds);

  return {
    durationSeconds,
    distanceMeters,
    currentPaceSecondsPerKm,
    currentSpeedKmh,
    averagePaceSecondsPerKm,
  };
}

/**
 * Formats pace into human-readable runner format: "5:12 /km" or "--".
 * Returns "--" when stationary, null, or out of bounds.
 */
export function formatDisplayPace(paceSecondsPerKm: number | null | undefined): string {
  if (paceSecondsPerKm == null || !Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm <= 0) {
    return "--";
  }
  return `${formatPace(paceSecondsPerKm)} /km`;
}

/**
 * Formats speed into human-readable runner format: "10.5 km/h" or "--".
 */
export function formatDisplaySpeed(speedKmh: number | null | undefined): string {
  if (speedKmh == null || !Number.isFinite(speedKmh) || speedKmh <= 0) {
    return "--";
  }
  return `${speedKmh.toFixed(1)} km/h`;
}

/**
 * Formats distance into kilometres: "1.24 km".
 */
export function formatDisplayDistance(distanceMeters: number): string {
  const km = distanceMeters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Formats duration in seconds into "MM:SS" or "H:MM:SS".
 */
export function formatDisplayDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const paddedMinutes = minutes.toString().padStart(2, "0");
  const paddedSeconds = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
}
