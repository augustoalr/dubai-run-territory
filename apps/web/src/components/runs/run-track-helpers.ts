import { parseGpx } from "@dubai-run/core";

export interface TrackBounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  spanLon: number;
  spanLat: number;
  isVeryShort: boolean;
}

export interface SvgTrackPoint {
  x: number;
  y: number;
}

export interface SvgTrackData {
  isVeryShort: boolean;
  width: number;
  height: number;
  startPt: SvgTrackPoint;
  endPt: SvgTrackPoint | null;
  polyline: string | null;
}

export interface ResolveTrackInput {
  gpx?: string;
  coordinates?: readonly [number, number][];
}

const VERY_SHORT_SPAN_DEG = 0.00015;

/**
 * Resolves [lon, lat] coordinates for RunMiniMap.
 * Prioritizes explicit `coordinates` when non-empty; otherwise parses `gpx`.
 */
export function resolveTrackCoordinates(input: ResolveTrackInput): [number, number][] {
  if (input.coordinates && input.coordinates.length > 0) {
    const valid: [number, number][] = [];
    for (const coord of input.coordinates) {
      if (!Array.isArray(coord) || coord.length < 2) continue;
      const [lon, lat] = coord;
      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        valid.push([lon, lat]);
      }
    }
    if (valid.length > 0) {
      return valid;
    }
  }

  if (input.gpx && input.gpx.trim().length > 0) {
    try {
      const parsed = parseGpx(input.gpx);
      return parsed.points
        .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat))
        .map((p): [number, number] => [p.lon, p.lat]);
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * A track needs at least 2 points to render a line on the mini map.
 */
export function isRenderableTrack(coordinates: readonly [number, number][]): boolean {
  return coordinates.length >= 2;
}

/**
 * Computes geographic bounding box and whether the track is very short (< ~15m).
 */
export function computeTrackBounds(coordinates: readonly [number, number][]): TrackBounds | null {
  if (coordinates.length === 0) return null;

  const first = coordinates[0];
  if (!first) return null;

  let minLon = first[0];
  let maxLon = first[0];
  let minLat = first[1];
  let maxLat = first[1];

  for (const [lon, lat] of coordinates) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const spanLon = maxLon - minLon;
  const spanLat = maxLat - minLat;
  const isVeryShort = spanLon < VERY_SHORT_SPAN_DEG && spanLat < VERY_SHORT_SPAN_DEG;

  return { minLon, maxLon, minLat, maxLat, spanLon, spanLat, isVeryShort };
}

/**
 * Projects [lon, lat] coordinates into an SVG viewport while preserving aspect ratio.
 */
export function computeSvgTrackData(
  coordinates: readonly [number, number][],
  trackBounds: TrackBounds | null,
): SvgTrackData | null {
  if (!trackBounds || coordinates.length === 0) return null;

  const width = 280;
  const height = 160;

  if (trackBounds.isVeryShort || coordinates.length < 2) {
    return {
      isVeryShort: true,
      width,
      height,
      startPt: { x: 140, y: 75 },
      endPt: null,
      polyline: null,
    };
  }

  const padding = 28;
  const centerLat = (trackBounds.minLat + trackBounds.maxLat) / 2;
  const aspectCos = Math.cos((centerLat * Math.PI) / 180);
  const spanX = Math.max(trackBounds.spanLon * aspectCos, 0.00001);
  const spanY = Math.max(trackBounds.spanLat, 0.00001);

  const availW = width - 2 * padding;
  const availH = height - 2 * padding;
  const scale = Math.min(availW / spanX, availH / spanY);

  const trackW = spanX * scale;
  const trackH = spanY * scale;
  const offsetX = padding + (availW - trackW) / 2;
  const offsetY = padding + (availH - trackH) / 2;

  const svgCoords = coordinates.map(([lon, lat]) => {
    const x = offsetX + (lon - trackBounds.minLon) * aspectCos * scale;
    const y = height - (offsetY + (lat - trackBounds.minLat) * scale);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const polyline = svgCoords.map((c) => `${c.x},${c.y}`).join(" ");
  const startPt = svgCoords[0];
  const endPt = svgCoords[svgCoords.length - 1];
  if (!startPt || !endPt) return null;

  return {
    isVeryShort: false,
    width,
    height,
    startPt,
    endPt: startPt.x !== endPt.x || startPt.y !== endPt.y ? endPt : null,
    polyline,
  };
}
