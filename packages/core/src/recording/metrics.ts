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
 */
export function calculateDistanceMeters(points: readonly RecordedPoint[]): number {
  let totalMeters = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) continue;
    totalMeters += haversineMeters([prev.lon, prev.lat], [curr.lon, curr.lat]);
  }
  return totalMeters;
}

/**
 * Calculates instantaneous/current pace (in seconds per km) from recent points
 * within a rolling time window (default 20 seconds). Returns null if stationary or insufficient data.
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
 * Calculates average pace in seconds per kilometre.
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
  const averagePaceSecondsPerKm = calculateAveragePaceSecondsPerKm(distanceMeters, durationSeconds);

  return {
    durationSeconds,
    distanceMeters,
    currentPaceSecondsPerKm,
    averagePaceSecondsPerKm,
  };
}

/**
 * Formats pace into human-readable runner format: "5:12 /km".
 * Never uses "s/km" or internal codes.
 */
export function formatDisplayPace(paceSecondsPerKm: number | null | undefined): string {
  if (paceSecondsPerKm == null || !Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm <= 0) {
    return "-:-- /km";
  }
  return `${formatPace(paceSecondsPerKm)} /km`;
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
