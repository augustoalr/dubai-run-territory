import { haversineMeters } from "../geo/measure";
import type { LngLat } from "../geo/types";
import type { RawPoint } from "../parse/types";
import { jumeirahKiteZone } from "../zones/registry";

/** Walk the Jumeirah · Kite centreline. Used by tests. */
export function traceCenterline(options: {
  distanceM: number;
  paceSPerKm: number;
  startMs?: number;
  everyS?: number;
  fromM?: number;
}): RawPoint[] {
  const line = jumeirahKiteZone.centerline?.coordinates;
  if (!line || line.length < 2) throw new Error("missing centerline");
  const speed = 1000 / options.paceSPerKm;
  const everyS = options.everyS ?? 1;
  const startMs = options.startMs ?? Date.UTC(2026, 9, 19, 2, 30, 0);
  const fromM = options.fromM ?? 0;
  const points: RawPoint[] = [];
  const steps = Math.round(options.distanceM / speed);
  for (let second = 0; second <= steps; second += everyS) {
    const travelled = Math.min(options.distanceM, second * speed);
    const at = pointAlong(line, fromM + travelled);
    points.push({ t: startMs + second * 1000, lat: at[1], lon: at[0] });
    if (travelled >= options.distanceM) break;
  }
  return points;
}

export function pointAlong(line: readonly LngLat[], distanceM: number): LngLat {
  let left = Math.max(0, distanceM);
  for (let index = 1; index < line.length; index += 1) {
    const start = line[index - 1];
    const end = line[index];
    if (!start || !end) continue;
    const step = haversineMeters(start, end);
    if (step >= left) {
      const fraction = step === 0 ? 0 : left / step;
      return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction];
    }
    left -= step;
  }
  const last = line[line.length - 1];
  if (!last) throw new Error("empty line");
  return last;
}

export function requireZonePolygon() {
  const polygon = jumeirahKiteZone.polygon;
  if (!polygon) throw new Error("missing polygon");
  return polygon;
}
