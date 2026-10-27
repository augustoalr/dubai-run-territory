import {
  POLYGON_TO_CELLS_FLAGS,
  cellToBoundary,
  cellToLatLng,
  getResolution,
  polygonToCellsExperimental,
} from "h3-js";
import type { LngLat, PolygonGeometry } from "../geo/types";
import type { ZoneDefinition } from "./types";

/**
 * Resolution 10 is the Fase 0 choice (ARQUITECTURA §7.3, decisión de Augusto).
 *
 * Official H3 means, from h3-js / h3geo.org: edge ~66 m, area ~15,047 m²,
 * opposite vertices ~132 m. That is a few hundred metres or less.
 * A cell is crossed in about 30–45 s at 5:00/km, so the 1 km pace window
 * in PRODUCTO §3.2 measures a real effort instead of a GPS-noisy sprint.
 * Resolution 9 (~174 m edge) swallows beach and road together.
 * Resolution 11 (~25 m edge) flickers under watch GPS and was rejected.
 */
export const TRACK_H3_RESOLUTION = 10;

export function cellsForPolygon(polygon: PolygonGeometry, resolution: number): string[] {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) return [];
  const cells = polygonToCellsExperimental(
    ring,
    resolution,
    POLYGON_TO_CELLS_FLAGS.containmentOverlapping,
    true,
  );
  return [...cells].sort();
}

export function cellsForZone(zone: ZoneDefinition): string[] {
  if (!zone.polygon) return [];
  return cellsForPolygon(zone.polygon, zone.h3Resolution);
}

export function cellCenter(h3Index: string): LngLat {
  const [lat, lng] = cellToLatLng(h3Index);
  return [lng, lat];
}

export function cellPolygon(h3Index: string): PolygonGeometry {
  const boundary = cellToBoundary(h3Index, true);
  const first = boundary[0];
  const last = boundary[boundary.length - 1];
  if (!first || !last) throw new Error(`empty boundary for ${h3Index}`);
  const closed =
    first[0] === last[0] && first[1] === last[1] ? boundary : [...boundary, [first[0], first[1]]];
  return { type: "Polygon", coordinates: [closed as LngLat[]] };
}

export function assertResolution(h3Index: string, resolution: number): void {
  if (getResolution(h3Index) !== resolution) {
    throw new Error(`${h3Index} is not resolution ${resolution}`);
  }
}
