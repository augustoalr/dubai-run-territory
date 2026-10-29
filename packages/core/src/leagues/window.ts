import { fastestWindowSeconds } from "../track/compute";
import type { TrackSegment } from "../track/normalize";

/**
 * Best continuous 1 km in the run, rounded to 1 s/km.
 * Lower is faster. Null when no segment reaches 1 km.
 * Windows do not cross a pause or a teleport: each segment is scanned alone.
 */
export function bestKmWindow(segments: readonly TrackSegment[]): number | null {
  const raw = fastestWindowSeconds(segments);
  if (raw === null || !Number.isFinite(raw) || raw <= 0) return null;
  const paceS = Math.round(raw);
  return paceS > 0 ? paceS : null;
}
