import { fromLocal, originOf, round6, signedRingArea, toLocal } from "./measure";
import type { LngLat, PolygonGeometry } from "./types";

type Xy = [number, number];

/**
 * Corridor around a track centerline.
 * The ring is an approximate geographic buffer (metres), with round caps.
 * Coordinates are rounded to 6 decimals (~0.1 m) so the GeoJSON stays stable.
 */
export function bufferCenterline(
  centerline: readonly LngLat[],
  radiusMeters: number,
): PolygonGeometry {
  if (radiusMeters <= 0) throw new Error("radius must be positive");
  const simplified = dedupe(centerline, 0.5);
  if (simplified.length < 2) throw new Error("centerline needs at least two points");

  const origin = originOf(simplified);
  const local = simplified.map((point) => toLocal(origin, point));
  const ring = offsetCorridor(local, radiusMeters).map((point) => fromLocal(origin, point));
  const closed = closeRing(ring);
  const oriented = signedRingArea(closed) < 0 ? reverseClosed(closed) : closed;
  return { type: "Polygon", coordinates: [oriented] };
}

function dedupe(line: readonly LngLat[], minMeters: number): LngLat[] {
  const kept: LngLat[] = [];
  for (const point of line) {
    const previous = kept[kept.length - 1];
    if (!previous) {
      kept.push(point);
      continue;
    }
    const origin = previous;
    const [x, y] = toLocal(origin, point);
    if (Math.hypot(x, y) >= minMeters) kept.push(point);
  }
  return kept;
}

function offsetCorridor(points: Xy[], radius: number): Xy[] {
  const segmentCount = points.length - 1;
  const directions: Xy[] = [];
  const leftNormals: Xy[] = [];
  for (let i = 0; i < segmentCount; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    if (!start || !end) continue;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy) || 1;
    const direction: Xy = [dx / length, dy / length];
    directions.push(direction);
    leftNormals.push([-direction[1], direction[0]]);
  }

  const left: Xy[] = [];
  const right: Xy[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (!point) continue;
    if (i === 0 || i === points.length - 1) {
      const normal = leftNormals[i === 0 ? 0 : leftNormals.length - 1];
      if (!normal) continue;
      left.push(add(point, scale(normal, radius)));
      right.push(add(point, scale(normal, -radius)));
      continue;
    }
    const incoming = leftNormals[i - 1];
    const outgoing = leftNormals[i];
    if (!incoming || !outgoing) continue;
    const summed: Xy = [incoming[0] + outgoing[0], incoming[1] + outgoing[1]];
    const magnitude = Math.hypot(summed[0], summed[1]);
    if (magnitude < 1e-6) {
      left.push(add(point, scale(incoming, radius)), add(point, scale(outgoing, radius)));
      right.push(add(point, scale(incoming, -radius)), add(point, scale(outgoing, -radius)));
      continue;
    }
    const miter: Xy = [summed[0] / magnitude, summed[1] / magnitude];
    const cosPhi = incoming[0] * miter[0] + incoming[1] * miter[1];
    const miterLength = radius / Math.max(cosPhi, 0.2);
    if (miterLength > radius * 2.2) {
      left.push(add(point, scale(incoming, radius)), add(point, scale(outgoing, radius)));
      right.push(add(point, scale(incoming, -radius)), add(point, scale(outgoing, -radius)));
    } else {
      left.push(add(point, scale(miter, miterLength)));
      right.push(add(point, scale(miter, -miterLength)));
    }
  }

  const startNormal = leftNormals[0];
  const endNormal = leftNormals[leftNormals.length - 1];
  if (!startNormal || !endNormal) throw new Error("could not offset centerline");
  const end = points[points.length - 1];
  const start = points[0];
  if (!end || !start) throw new Error("could not offset centerline");

  const endCap = semicircle(end, Math.atan2(endNormal[1], endNormal[0]), -Math.PI, radius, 8);
  const startCap = semicircle(
    start,
    Math.atan2(-startNormal[1], -startNormal[0]),
    -Math.PI,
    radius,
    8,
  );
  return [...left, ...endCap, ...[...right].reverse(), ...startCap];
}

function semicircle(
  center: Xy,
  startAngle: number,
  delta: number,
  radius: number,
  steps: number,
): Xy[] {
  const points: Xy[] = [];
  for (let step = 1; step < steps; step += 1) {
    const angle = startAngle + (delta * step) / steps;
    points.push([center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]);
  }
  return points;
}

function add(point: Xy, offset: Xy): Xy {
  return [point[0] + offset[0], point[1] + offset[1]];
}

function scale(vector: Xy, factor: number): Xy {
  return [vector[0] * factor, vector[1] * factor];
}

function closeRing(ring: LngLat[]): LngLat[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return ring;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [round6(first[0]), round6(first[1])]];
}

function reverseClosed(ring: LngLat[]): LngLat[] {
  const open = ring.slice(0, -1).reverse();
  const first = open[0];
  if (!first) return ring;
  return [...open, [first[0], first[1]]];
}
