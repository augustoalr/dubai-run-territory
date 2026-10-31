import { haversineMeters } from "../geo/measure";
import type { PointFilterConfig, RecordedPoint } from "./types";

export const DEFAULT_FILTER_CONFIG: PointFilterConfig = {
  maxAccuracyMeters: 30,
  maxSpeedMps: 12, // 12 m/s = 43.2 km/h
};

/**
 * Validates whether an incoming GPS point satisfies accuracy and speed constraints.
 * Discards points with accuracy worse than 30 m or speeds representing impossible jumps.
 */
export function isValidRecordedPoint(
  current: RecordedPoint,
  previous?: RecordedPoint,
  customConfig?: Partial<PointFilterConfig>,
): boolean {
  const config = { ...DEFAULT_FILTER_CONFIG, ...customConfig };

  if (!Number.isFinite(current.lat) || Math.abs(current.lat) > 90) {
    return false;
  }
  if (!Number.isFinite(current.lon) || Math.abs(current.lon) > 180) {
    return false;
  }
  if (!Number.isFinite(current.time) || current.time <= 0) {
    return false;
  }

  // Discard poor accuracy (greater than 30 metres or non-positive)
  if (current.accuracy !== undefined) {
    if (!Number.isFinite(current.accuracy) || current.accuracy <= 0) {
      return false;
    }
    if (current.accuracy > config.maxAccuracyMeters) {
      return false;
    }
  }

  // If there is a previous accepted point, check time progression and impossible jumps
  if (previous) {
    const elapsedSeconds = (current.time - previous.time) / 1000;
    if (elapsedSeconds <= 0) {
      return false;
    }

    const distanceMeters = haversineMeters(
      [previous.lon, previous.lat],
      [current.lon, current.lat],
    );
    const speedMps = distanceMeters / elapsedSeconds;

    if (speedMps > config.maxSpeedMps) {
      return false;
    }
  }

  return true;
}

/**
 * Filters a sequence of GPS points, retaining only those with good accuracy
 * and rejecting impossible jumps sequentially.
 */
export function filterRecordedPoints(
  points: readonly RecordedPoint[],
  customConfig?: Partial<PointFilterConfig>,
): RecordedPoint[] {
  const accepted: RecordedPoint[] = [];

  for (const point of points) {
    const previous = accepted[accepted.length - 1];
    if (isValidRecordedPoint(point, previous, customConfig)) {
      accepted.push(point);
    }
  }

  return accepted;
}
