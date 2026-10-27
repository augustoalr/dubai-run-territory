import type { LngLat } from "../geo/types";

export type ZoneGeometryFile = {
  centerline: LngLat[];
  polygon: LngLat[][];
  bufferMeters: number;
};

export function readZoneGeometry(data: unknown): ZoneGeometryFile {
  if (!isRecord(data) || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error("zone file must be a FeatureCollection");
  }
  let centerline: LngLat[] | undefined;
  let polygon: LngLat[][] | undefined;
  let bufferMeters = 25;
  for (const feature of data.features) {
    if (!isRecord(feature) || !isRecord(feature.geometry) || !isRecord(feature.properties))
      continue;
    const role = feature.properties.role;
    if (role === "centerline" && feature.geometry.type === "LineString") {
      centerline = asLine(feature.geometry.coordinates);
    }
    if (role === "polygon" && feature.geometry.type === "Polygon") {
      polygon = asPolygon(feature.geometry.coordinates);
      if (typeof feature.properties.bufferMeters === "number") {
        bufferMeters = feature.properties.bufferMeters;
      }
    }
  }
  if (!centerline || !polygon) throw new Error("zone file needs a centerline and a polygon");
  return { centerline, polygon, bufferMeters };
}

function asLine(value: unknown): LngLat[] {
  if (!Array.isArray(value) || value.length < 2) throw new Error("invalid linestring");
  return value.map(asLngLat);
}

function asPolygon(value: unknown): LngLat[][] {
  if (!Array.isArray(value) || !Array.isArray(value[0])) throw new Error("invalid polygon");
  return value.map((ring) => {
    if (!Array.isArray(ring)) throw new Error("invalid ring");
    return ring.map(asLngLat);
  });
}

function asLngLat(value: unknown): LngLat {
  if (!Array.isArray(value) || value.length < 2) throw new Error("invalid coordinate");
  const lng = value[0];
  const lat = value[1];
  if (typeof lng !== "number" || typeof lat !== "number") throw new Error("invalid coordinate");
  return [lng, lat];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
