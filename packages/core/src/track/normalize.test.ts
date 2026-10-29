import { describe, expect, it } from "vitest";
import { distanceToPolylineMeters, haversineMeters } from "../geo/measure";
import type { PolygonGeometry } from "../geo/types";
import type { RawPoint } from "../parse/types";
import { RUN_SOURCES } from "../runs/source";
import { jumeirahKiteZone } from "../zones/registry";
import { clipToZone, normalize, normalizeActivity } from "./normalize";
import { requireZonePolygon, traceCenterline } from "./trace";

const polygon = requireZonePolygon();

describe("normalize", () => {
  it("sorts by time and drops a repeated timestamp", () => {
    const points: RawPoint[] = [
      { t: 2_000, lat: 25.19, lon: 55.23 },
      { t: 1_000, lat: 25.191, lon: 55.231, ele: 4, cad: 170, hr: 150 },
      { t: 1_000, lat: 25.192, lon: 55.232 },
      { t: Number.NaN, lat: 1, lon: 2 },
    ];
    const normalized = normalize(points);
    expect(normalized.droppedSpikes).toBe(0);
    expect(normalized.points.map((point) => point.t)).toEqual([1_000, 2_000]);
    expect(normalized.points[0]?.cad).toBe(170);
    expect(normalized.points[0]?.hr).toBe(150);
  });

  it("drops a GPS spike and keeps the samples on either side", () => {
    const points = traceCenterline({ distanceM: 200, paceSPerKm: 300 });
    const spiked = points.map((point) => ({ ...point }));
    const middle = spiked[Math.floor(spiked.length / 2)];
    if (!middle) throw new Error("empty trace");
    middle.lon += 0.00045;
    const normalized = normalize(spiked);
    expect(normalized.droppedSpikes).toBe(1);
    expect(normalized.points.some((point) => point.lon === middle.lon)).toBe(false);
    expect(normalized.points).toHaveLength(spiked.length - 1);
  });

  it("keeps both sides of a teleport instead of deleting the tail", () => {
    const head = traceCenterline({ distanceM: 600, paceSPerKm: 300 });
    const end = head.at(-1);
    if (!end) throw new Error("short trace");
    const tail = traceCenterline({
      distanceM: 800,
      paceSPerKm: 300,
      fromM: 2_000,
      startMs: end.t + 1_000,
    });
    const points = [...head, ...tail];
    const normalized = normalize(points);
    expect(normalized.droppedSpikes).toBe(0);
    expect(normalized.points).toHaveLength(points.length);
    const segments = clipToZone(normalized.points, polygon);
    expect(segments).toHaveLength(2);
    expect(segments[1]?.points).toHaveLength(tail.length);
    expect(segments[1]?.distanceM).toBeGreaterThan(700);
    const restart = segments[1]?.points[0];
    if (!restart) throw new Error("missing second segment");
    expect(haversineMeters([end.lon, end.lat], [restart.lon, restart.lat])).toBeGreaterThan(100);
    const activity = normalizeActivity({ points, source: "browser", polygon });
    expect(activity.splits).toEqual(["jump"]);
    expect(activity.segments).toHaveLength(2);
  });
});

describe("clipToZone", () => {
  it("splits a pause above 30 s and a jump above 100 m, and not the exact limits", () => {
    const box = square();
    const origin = { t: 0, lat: 25.05, lon: 55.05 };
    expect(
      clipToZone([origin, { ...origin, t: 30_000 }, { ...origin, t: 30_001 }], box),
    ).toHaveLength(1);
    expect(clipToZone([origin, { ...origin, t: 120_000 }], box)).toHaveLength(2);
    const paused = normalizeActivity({
      points: [origin, { ...origin, t: 120_000 }],
      source: "polar",
      polygon: box,
    });
    expect(paused.splits).toEqual(["gap"]);

    const at100 = eastBy(origin, 100);
    expect(haversineMeters([origin.lon, origin.lat], [at100.lon, at100.lat])).toBeLessThanOrEqual(
      100,
    );
    expect(clipToZone([origin, { ...at100, t: 1_000 }], box)).toHaveLength(1);
    const at101 = eastBy(origin, 100.5);
    expect(haversineMeters([origin.lon, origin.lat], [at101.lon, at101.lat])).toBeGreaterThan(100);
    expect(clipToZone([origin, { ...at101, t: 1_000 }], box)).toHaveLength(2);
  });

  it("drops points outside the polygon and keeps a point inside the 30 m margin", () => {
    const box = square();
    const inside = { t: 0, lat: 25.05, lon: 55.05 };
    const far = { t: 1_000, lat: 25.05, lon: 55.2 };
    const keptFar = clipToZone([inside, far], box);
    expect(keptFar).toHaveLength(1);
    expect(keptFar[0]?.points).toHaveLength(1);

    const edge = shiftEast({ t: 0, lat: 25.05, lon: 55.1 }, 10);
    const beyond = shiftEast({ t: 1_000, lat: 25.05, lon: 55.1 }, 50);
    const kept = clipToZone([edge, beyond], box, 30);
    expect(kept.flatMap((segment) => segment.points)).toHaveLength(1);
    expect(kept[0]?.points[0]?.lon).toBeCloseTo(edge.lon, 6);
  });

  it("drops a point in a hole when it is more than the margin from the edge", () => {
    const withHole: PolygonGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [55, 25],
          [55.1, 25],
          [55.1, 25.1],
          [55, 25.1],
          [55, 25],
        ],
        [
          [55.04, 25.04],
          [55.04, 25.06],
          [55.06, 25.06],
          [55.06, 25.04],
          [55.04, 25.04],
        ],
      ],
    };
    const inHole = { t: 0, lat: 25.05, lon: 55.05 };
    const nearHoleEdge = { t: 1_000, lat: 25.04005, lon: 55.05 };
    const clear = { t: 2_000, lat: 25.08, lon: 55.08 };
    const kept = clipToZone([inHole, nearHoleEdge, clear], withHole, 30);
    const lats = kept.flatMap((segment) => segment.points).map((point) => point.lat);
    expect(lats).toContain(25.08);
    expect(lats).toContain(25.04005);
    expect(lats).not.toContain(25.05);
  });

  it("returns nothing for an empty ring", () => {
    const empty: PolygonGeometry = { type: "Polygon", coordinates: [[]] };
    expect(clipToZone([{ t: 0, lat: 1, lon: 2 }], empty)).toEqual([]);
  });

  it("removes the off-track spike and leaves one segment on the centreline", () => {
    const points = traceCenterline({ distanceM: 1_000, paceSPerKm: 300 });
    const spiked = points.map((point) => ({ ...point }));
    const sample = spiked[Math.floor(spiked.length / 2)];
    if (!sample) throw new Error("missing sample");
    sample.lon += 0.0007;
    const activity = normalizeActivity({
      points: spiked,
      source: "upload",
      sport: "running",
      polygon,
    });
    expect(activity.droppedSpikes).toBe(1);
    expect(activity.segments).toHaveLength(1);
    expect(activity.splits).toEqual([]);
    const limit = jumeirahKiteZone.centerline?.coordinates;
    if (!limit) throw new Error("missing centerline");
    for (const point of activity.segments[0]?.points ?? []) {
      expect(distanceToPolylineMeters([point.lon, point.lat], limit)).toBeLessThan(30);
    }
  });
});

describe("normalizeActivity", () => {
  it("keeps the source the caller declares", () => {
    const points = traceCenterline({ distanceM: 50, paceSPerKm: 300 });
    for (const source of RUN_SOURCES) {
      const activity = normalizeActivity({ points, source, polygon });
      expect(activity.source).toBe(source);
      expect(activity.sport).toBeUndefined();
    }
    const named = normalizeActivity({ points, source: "garmin", sport: "running", polygon });
    expect(named.sport).toBe("running");
    expect(named.startedAt).toBe(points[0]?.t);
  });
});

function square(): PolygonGeometry {
  return {
    type: "Polygon",
    coordinates: [
      [
        [55, 25],
        [55.1, 25],
        [55.1, 25.1],
        [55, 25.1],
        [55, 25],
      ],
    ],
  };
}

function shiftEast(point: RawPoint, meters: number): RawPoint {
  const degrees = meters / (111_320 * Math.cos((point.lat * Math.PI) / 180));
  return { ...point, lon: point.lon + degrees };
}

function eastBy(point: RawPoint, meters: number): RawPoint {
  const guess = shiftEast(point, meters);
  const actual = haversineMeters([point.lon, point.lat], [guess.lon, guess.lat]);
  if (actual === 0) return guess;
  return shiftEast(point, (meters * meters) / actual);
}
