import type { LngLat } from "./types";

const EARTH_RADIUS_M = 6_378_137;

export function haversineMeters(a: LngLat, b: LngLat): number {
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function polylineLengthMeters(line: readonly LngLat[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i += 1) {
    const prev = line[i - 1];
    const next = line[i];
    if (!prev || !next) continue;
    total += haversineMeters(prev, next);
  }
  return total;
}

export function originOf(line: readonly LngLat[]): LngLat {
  const first = line[0];
  if (!first) throw new Error("empty line");
  let lat = 0;
  for (const point of line) lat += point[1];
  return [first[0], lat / line.length];
}

/** Equirectangular meters around `origin`. Accurate enough for a few kilometres. */
export function toLocal(origin: LngLat, point: LngLat): [number, number] {
  const lat0 = (origin[1] * Math.PI) / 180;
  const x = ((point[0] - origin[0]) * Math.PI * EARTH_RADIUS_M * Math.cos(lat0)) / 180;
  const y = ((point[1] - origin[1]) * Math.PI * EARTH_RADIUS_M) / 180;
  return [x, y];
}

export function fromLocal(origin: LngLat, point: [number, number]): LngLat {
  const lat0 = (origin[1] * Math.PI) / 180;
  const lng = origin[0] + (point[0] * 180) / (Math.PI * EARTH_RADIUS_M * Math.cos(lat0));
  const lat = origin[1] + (point[1] * 180) / (Math.PI * EARTH_RADIUS_M);
  return [round6(lng), round6(lat)];
}

export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function distanceToPolylineMeters(point: LngLat, line: readonly LngLat[]): number {
  const origin = originOf(line.length > 0 ? line : [point]);
  const target = toLocal(origin, point);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < line.length; i += 1) {
    const start = line[i - 1];
    const end = line[i];
    if (!start || !end) continue;
    const a = toLocal(origin, start);
    const b = toLocal(origin, end);
    best = Math.min(best, distanceToSegment(target, a, b));
  }
  return best;
}

function distanceToSegment(
  point: [number, number],
  start: [number, number],
  end: [number, number],
): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / len2),
  );
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

/** Signed area in the lng/lat plane. Positive means counter-clockwise. */
export function signedRingArea(ring: readonly LngLat[]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const current = ring[i];
    const next = ring[i + 1];
    if (!current || !next) continue;
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
}

export function pointInRing(point: LngLat, ring: readonly LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const current = ring[i];
    const previous = ring[j];
    if (!current || !previous) continue;
    const intersects =
      current[1] > point[1] !== previous[1] > point[1] &&
      point[0] <
        ((previous[0] - current[0]) * (point[1] - current[1])) / (previous[1] - current[1] + 0) +
          current[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Shoelace area in square metres, using a local projection. */
export function ringAreaSquareMeters(ring: readonly LngLat[]): number {
  if (ring.length < 4) return 0;
  const origin = originOf(ring);
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const current = ring[i];
    const next = ring[i + 1];
    if (!current || !next) continue;
    const a = toLocal(origin, current);
    const b = toLocal(origin, next);
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area) / 2;
}
