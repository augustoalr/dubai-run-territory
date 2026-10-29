import { describe, expect, it } from "vitest";
import { parseCellEfforts } from "../efforts/cell-effort";
import type { RawPoint } from "../parse/types";
import { TRACK_H3_RESOLUTION, cellsForZone, jumeirahKiteZone } from "../index";
import { computeCellEfforts } from "./compute";
import { normalizeActivity } from "./normalize";
import { requireZonePolygon, traceCenterline } from "./trace";

const polygon = requireZonePolygon();
const zoneCells = cellsForZone(jumeirahKiteZone);

describe("computeCellEfforts", () => {
  it("scores a steady 5:00/km run inside 300 ± 3 and ignores a short segment", () => {
    const steady = activityFor(traceCenterline({ distanceM: 5_000, paceSPerKm: 300 }));
    const efforts = computeCellEfforts(steady.segments, TRACK_H3_RESOLUTION, zoneCells);
    expect(parseCellEfforts(efforts)).toEqual(efforts);
    expect(efforts.length).toBeGreaterThan(40);
    for (const effort of efforts) {
      expect(effort.paceS).toBeGreaterThanOrEqual(297);
      expect(effort.paceS).toBeLessThanOrEqual(303);
      expect(Math.abs(effort.windowEndM - effort.windowStartM - 1_000)).toBeLessThan(0.001);
      expect(effort.crossedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
    expect(computeCellEfforts(steady.segments, TRACK_H3_RESOLUTION, zoneCells)).toEqual(efforts);

    const short = activityFor(traceCenterline({ distanceM: 800, paceSPerKm: 300 }));
    expect(short.segments[0]?.distanceM).toBeLessThan(1_000);
    expect(computeCellEfforts(short.segments, TRACK_H3_RESOLUTION, zoneCells)).toEqual([]);
  });

  it("keeps the faster pass when the same cell is run out and back", () => {
    const outbound = traceCenterline({ distanceM: 2_000, paceSPerKm: 240, startMs: 1_000 });
    const turn = outbound.at(-1);
    if (!turn) throw new Error("empty outbound");
    const inboundForward = traceCenterline({
      distanceM: 2_000,
      paceSPerKm: 360,
      startMs: turn.t + 60_000,
    });
    const inbound = inboundForward.map((point, index) => {
      const mirror = inboundForward[inboundForward.length - 1 - index];
      if (!mirror) return point;
      return { t: point.t, lat: mirror.lat, lon: mirror.lon };
    });
    const run = activityFor([...outbound, ...inbound]);
    expect(run.segments).toHaveLength(2);
    const efforts = computeCellEfforts(run.segments, TRACK_H3_RESOLUTION, zoneCells);
    expect(parseCellEfforts(efforts)).toEqual(efforts);
    expect(efforts.length).toBeGreaterThan(10);
    for (const effort of efforts) {
      expect(effort.paceS).toBeGreaterThanOrEqual(237);
      expect(effort.paceS).toBeLessThanOrEqual(243);
    }
  });

  it("ignores cells that are not in the zone set", () => {
    const run = activityFor(traceCenterline({ distanceM: 2_000, paceSPerKm: 300 }));
    const efforts = computeCellEfforts(run.segments, TRACK_H3_RESOLUTION, zoneCells);
    const dropped = efforts[0]?.h3;
    if (!dropped) throw new Error("no efforts");
    const filtered = computeCellEfforts(
      run.segments,
      TRACK_H3_RESOLUTION,
      zoneCells.filter((cell) => cell !== dropped),
    );
    expect(filtered.map((effort) => effort.h3)).not.toContain(dropped);
    expect(filtered).toHaveLength(efforts.length - 1);
  });
});

function activityFor(points: RawPoint[]) {
  return normalizeActivity({ points, source: "upload", sport: "running", polygon });
}
