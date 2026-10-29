import { latLngToCell } from "h3-js";
import { CELL_EFFORT_WINDOW_M, type CellEffort } from "../efforts/cell-effort";
import { haversineMeters } from "../geo/measure";
import { cellCenter } from "../zones/cells";
import type { NormalizedPoint, TrackSegment } from "./normalize";

/**
 * Best pace per H3 cell (PRODUCTO §3.2), in the `CellEffort` shape from main.
 * The window is 1 km of haversine centred on the pass through the cell.
 * Near either end of a segment it slides inward so it still covers 1 km.
 * A segment shorter than 1 km scores nothing. A cell visited twice keeps the faster pace.
 * Cells absent from `zoneCells` are ignored. The result is sorted and deterministic.
 */
export function computeCellEfforts(
  segments: readonly TrackSegment[],
  resolution: number,
  zoneCells: readonly string[],
): CellEffort[] {
  const zone = new Set(zoneCells);
  const best = new Map<string, CellEffort>();
  for (const segment of segments) {
    if (segment.distanceM < CELL_EFFORT_WINDOW_M || segment.points.length === 0) continue;
    for (const visit of visits(segment.points, resolution)) {
      if (!zone.has(visit.h3)) continue;
      const anchor = anchorDistance(segment.points, visit);
      const window = placeWindow(segment.distanceM, anchor, CELL_EFFORT_WINDOW_M);
      if (!window) continue;
      const paceS = Math.round(paceSeconds(segment.points, window.startM, window.endM));
      if (!Number.isInteger(paceS) || paceS <= 0) continue;
      const effort: CellEffort = {
        h3: visit.h3,
        crossedAt: new Date(Math.round(timeAt(segment.points, anchor))).toISOString(),
        paceS,
        windowStartM: window.startM,
        windowEndM: window.endM,
      };
      const previous = best.get(visit.h3);
      if (
        !previous ||
        effort.paceS < previous.paceS ||
        (effort.paceS === previous.paceS && effort.crossedAt < previous.crossedAt)
      ) {
        best.set(visit.h3, effort);
      }
    }
  }
  return [...best.values()].sort((left, right) => {
    if (left.h3 < right.h3) return -1;
    if (left.h3 > right.h3) return 1;
    return 0;
  });
}

type Visit = { h3: string; from: number; to: number };

function visits(points: readonly NormalizedPoint[], resolution: number): Visit[] {
  const found: Visit[] = [];
  let current: Visit | null = null;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point) continue;
    const h3 = latLngToCell(point.lat, point.lon, resolution);
    if (current && current.h3 === h3) {
      current.to = index;
      continue;
    }
    current = { h3, from: index, to: index };
    found.push(current);
  }
  return found;
}

/** Distance along the segment closest to the cell centre, clamped to this visit. */
function anchorDistance(points: readonly NormalizedPoint[], visit: Visit): number {
  const center = cellCenter(visit.h3);
  let bestDistance = points[visit.from]?.distanceM ?? 0;
  let bestOffset = Number.POSITIVE_INFINITY;
  const last = Math.min(visit.to, points.length - 1);
  for (let index = visit.from; index <= last; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (!start) continue;
    if (!end || index === last) {
      const offset = haversineMeters([start.lon, start.lat], center);
      if (offset < bestOffset) {
        bestOffset = offset;
        bestDistance = start.distanceM;
      }
      continue;
    }
    for (let step = 0; step <= 8; step += 1) {
      const fraction = step / 8;
      const lat = start.lat + (end.lat - start.lat) * fraction;
      const lon = start.lon + (end.lon - start.lon) * fraction;
      const offset = haversineMeters([lon, lat], center);
      if (offset < bestOffset) {
        bestOffset = offset;
        bestDistance = start.distanceM + (end.distanceM - start.distanceM) * fraction;
      }
    }
  }
  return bestDistance;
}

function placeWindow(
  lengthM: number,
  anchorM: number,
  windowM: number,
): { startM: number; endM: number } | null {
  if (lengthM + 1e-6 < windowM) return null;
  let startM = anchorM - windowM / 2;
  if (startM < 0) startM = 0;
  if (startM + windowM > lengthM) startM = lengthM - windowM;
  if (startM < -1e-6) return null;
  if (startM < 0) startM = 0;
  const start = Number(startM.toFixed(3));
  return { startM: start, endM: Number((start + windowM).toFixed(3)) };
}

function paceSeconds(points: readonly NormalizedPoint[], startM: number, endM: number): number {
  const distanceKm = (endM - startM) / 1000;
  if (distanceKm <= 0) return Number.POSITIVE_INFINITY;
  return (timeAt(points, endM) - timeAt(points, startM)) / 1000 / distanceKm;
}

function timeAt(points: readonly NormalizedPoint[], distanceM: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (distanceM <= first.distanceM) return first.t;
  if (distanceM >= last.distanceM) return last.t;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current || current.distanceM < distanceM) continue;
    const span = current.distanceM - previous.distanceM;
    if (span <= 1e-6) return current.t;
    const fraction = (distanceM - previous.distanceM) / span;
    return previous.t + fraction * (current.t - previous.t);
  }
  return last.t;
}

/** Fastest 1 km inside the segments, in s/km, before rounding. Null when nothing reaches 1 km. */
export function fastestWindowSeconds(segments: readonly TrackSegment[]): number | null {
  let best: number | null = null;
  for (const segment of segments) {
    if (segment.distanceM < CELL_EFFORT_WINDOW_M) continue;
    for (const point of segment.points) {
      if (point.distanceM < CELL_EFFORT_WINDOW_M) continue;
      const pace = paceSeconds(
        segment.points,
        point.distanceM - CELL_EFFORT_WINDOW_M,
        point.distanceM,
      );
      if (best === null || pace < best) best = pace;
    }
  }
  return best;
}
