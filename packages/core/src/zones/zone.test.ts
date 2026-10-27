import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getHexagonAreaAvg, getHexagonEdgeLengthAvg, latLngToCell } from "h3-js";
import { describe, expect, it } from "vitest";
import cellsFile from "../../../../supabase/seed/zones/jumeirah-kite.cells.json";
import centerlineFile from "../../../../supabase/seed/zones/jumeirah-kite.centerline.json";
import { bufferCenterline } from "../geo/buffer";
import {
  distanceToPolylineMeters,
  pointInRing,
  polylineLengthMeters,
  ringAreaSquareMeters,
} from "../geo/measure";
import type { LngLat } from "../geo/types";
import { cellCenter, cellsForZone } from "./cells";
import { ZONE_CATALOG, activeZones, getZone, jumeirahKiteZone } from "./registry";

const zoneDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../supabase/seed/zones");

describe("jumeirah-kite zone", () => {
  it("keeps the track as configuration and leaves the other zones as drafts", () => {
    expect(ZONE_CATALOG.map((zone) => zone.slug)).toEqual([
      "jumeirah-kite",
      "dubai-marina",
      "al-qudra",
      "downtown",
    ]);
    expect(activeZones().map((zone) => zone.slug)).toEqual(["jumeirah-kite"]);
    expect(getZone("al-qudra")?.h3Resolution).toBe(9);
    expect(getZone("dubai-marina")?.polygon).toBeUndefined();
    expect(getZone("downtown")?.h3Resolution).toBe(10);
  });

  it("buffers the real centerline by about 25 m", () => {
    const line = jumeirahKiteZone.centerline?.coordinates;
    const ring = jumeirahKiteZone.polygon?.coordinates[0];
    if (!line || !ring) throw new Error("missing geometry");

    const length = polylineLengthMeters(line);
    expect(length).toBeGreaterThan(6_500);
    expect(length).toBeLessThan(7_200);

    const midpoint = line[Math.floor(line.length / 2)];
    if (!midpoint) throw new Error("empty line");
    expect(pointInRing(midpoint, ring)).toBe(true);

    const distances = ring.slice(0, -1).map((point) => distanceToPolylineMeters(point, line));
    distances.sort((a, b) => a - b);
    const median = distances[Math.floor(distances.length / 2)] ?? 0;
    expect(median).toBeGreaterThan(23);
    expect(median).toBeLessThan(32);

    const area = ringAreaSquareMeters(ring);
    expect(area).toBeGreaterThan(250_000);
    expect(area).toBeLessThan(550_000);
  });

  it("cuts overlapping H3 resolution 10 cells and matches the seed file", () => {
    const edge = getHexagonEdgeLengthAvg(10, "m");
    const area = getHexagonAreaAvg(10, "m2");
    expect(edge).toBeGreaterThan(60);
    expect(edge).toBeLessThan(80);
    expect(area).toBeGreaterThan(14_000);
    expect(area).toBeLessThan(16_000);

    const cells = cellsForZone(jumeirahKiteZone);
    expect(cells).toEqual(cellsFile.cells);
    expect(cellsFile.count).toBe(cells.length);
    expect(cells.length).toBeGreaterThan(40);
    expect(cells.length).toBeLessThan(250);

    const line = jumeirahKiteZone.centerline?.coordinates ?? [];
    for (let i = 0; i < line.length; i += 12) {
      const point = line[i];
      if (!point) continue;
      const index = latLngToCell(point[1], point[0], 10);
      expect(cells).toContain(index);
    }

    const center = cellCenter(cells[0] ?? "");
    expect(center[0]).toBeGreaterThan(55);
    expect(center[1]).toBeGreaterThan(25);
  });

  it("keeps the GeoJSON seed identical to the imported JSON", () => {
    const geojson = readFileSync(join(zoneDir, "jumeirah-kite.geojson"), "utf8");
    const json = readFileSync(join(zoneDir, "jumeirah-kite.json"), "utf8");
    expect(geojson).toBe(json);
  });

  it("rebuilds the same polygon from the centerline", () => {
    const line = centerlineFile as LngLat[];
    const rebuilt = bufferCenterline(line, 25);
    expect(rebuilt).toEqual(jumeirahKiteZone.polygon);
  });
});
