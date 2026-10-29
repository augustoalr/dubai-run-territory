import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCellEfforts } from "../efforts/cell-effort";
import { distanceToPolylineMeters, pointInRing } from "../geo/measure";
import { isTrackParseError, type ParseErrorCode } from "../parse/errors";
import { parseFit } from "../parse/fit";
import { parseGpx } from "../parse/gpx";
import type { RawPoint, Sport } from "../parse/types";
import type { RunSource } from "../runs/source";
import { TRACK_H3_RESOLUTION, cellsForZone } from "../zones/cells";
import { jumeirahKiteZone } from "../zones/registry";
import { assessRun } from "./assess";
import { trackHash } from "./hash";
import { normalizeActivity } from "./normalize";
import { requireZonePolygon } from "./trace";

type FixtureExpectation = {
  id: string;
  file: string;
  format: "gpx" | "fit";
  sport: Sport | null;
  status: "accepted" | "review" | "rejected";
  reason: string | null;
  approxCells: number;
  scoringCells: number;
  paceSPerKm: number | null;
  pointCount: number;
  segmentCount: number;
  duplicateOf: string | null;
  sameTrackAs: string | null;
  throws: ParseErrorCode | null;
};

type Prepared = {
  fixture: FixtureExpectation;
  points: RawPoint[];
  sport?: Sport;
  parseError: ParseErrorCode | null;
  fileSha256: string;
  trackHash: string | null;
};

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures");
const polygon = requireZonePolygon();
const ring = polygon.coordinates[0];
const zoneCells = cellsForZone(jumeirahKiteZone);
const clock = Date.UTC(2026, 9, 19, 6, 0, 0);

const fixtures: FixtureExpectation[] = readdirSync(fixturesDir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as FixtureExpectation);

describe("fixture contract", () => {
  it("matches every expected status, reason and cell count", async () => {
    if (!ring) throw new Error("missing zone ring");
    const prepared = fixtures.map((fixture) => load(fixture));
    for (const entry of prepared) {
      if (entry.parseError) continue;
      const activity = normalizeActivity({
        points: entry.points,
        source: "upload",
        sport: entry.sport,
        polygon,
      });
      entry.trackHash = await trackHash(activity);
    }
    const byId = new Map(prepared.map((entry) => [entry.fixture.id, entry]));

    for (const entry of prepared) {
      const original = entry.fixture.duplicateOf ? byId.get(entry.fixture.duplicateOf) : undefined;
      const twin = entry.fixture.sameTrackAs ? byId.get(entry.fixture.sameTrackAs) : undefined;
      const result = await assessRun({
        points: entry.points,
        source: "upload",
        sport: entry.sport,
        polygon,
        zoneCells,
        resolution: TRACK_H3_RESOLUTION,
        fileSha256: entry.fileSha256,
        parseError: entry.parseError,
        context: {
          now: clock,
          uploadedAt: clock,
          userId: "runner-a",
          ownFileHashes: original ? [original.fileSha256] : [],
          ownRuns: [],
          knownTracks:
            twin?.trackHash && entry.fixture.id !== twin.fixture.id
              ? [{ trackHash: twin.trackHash, userId: "runner-b" }]
              : [],
          runsToday: 0,
        },
      });

      expect(result.status, entry.fixture.id).toBe(entry.fixture.status);
      expect(result.reason, entry.fixture.id).toBe(entry.fixture.reason);
      expect(result.approxCells, entry.fixture.id).toBe(entry.fixture.approxCells);
      expect(result.source).toBe<RunSource>("upload");

      if (entry.parseError) {
        expect(result.activity).toBeNull();
        continue;
      }

      const activity = result.activity;
      if (!activity) throw new Error(`${entry.fixture.id} was not normalised`);
      expect(activity.segments, entry.fixture.id).toHaveLength(entry.fixture.segmentCount);
      expect(result.efforts, entry.fixture.id).toHaveLength(entry.fixture.scoringCells);
      expect(parseCellEfforts(result.efforts)).toEqual(result.efforts);
      if (entry.fixture.paceSPerKm !== null) {
        for (const effort of result.efforts) {
          expect(Math.abs(effort.paceS - entry.fixture.paceSPerKm)).toBeLessThanOrEqual(3);
        }
      }
      for (const segment of activity.segments) {
        for (const point of segment.points) {
          const here: [number, number] = [point.lon, point.lat];
          const inside = pointInRing(here, ring) || distanceToPolylineMeters(here, ring) <= 30;
          expect(inside, entry.fixture.id).toBe(true);
        }
      }

      if (entry.fixture.id === "teleport-500m") {
        expect(activity.splits).toContain("jump");
        expect(activity.droppedSpikes).toBe(0);
        expect(activity.segments[1]?.distanceM).toBeGreaterThan(2_000);
      }
      if (entry.fixture.id === "pause-2min") expect(activity.splits).toContain("gap");
      if (entry.fixture.id === "gps-spike") {
        expect(activity.droppedSpikes).toBe(1);
        const kept = activity.segments.reduce((total, segment) => total + segment.points.length, 0);
        expect(kept).toBe(entry.fixture.pointCount - 1);
      }
    }
  });
});

function load(fixture: FixtureExpectation): Prepared {
  const bytes = readFileSync(join(fixturesDir, fixture.file));
  const fileSha256 = createHash("sha256").update(bytes).digest("hex");
  try {
    const parsed =
      fixture.format === "gpx" ? parseGpx(bytes.toString("utf8")) : parseFit(new Uint8Array(bytes));
    return {
      fixture,
      points: parsed.points,
      sport: parsed.sport,
      parseError: null,
      fileSha256,
      trackHash: null,
    };
  } catch (error) {
    if (!isTrackParseError(error)) throw error;
    return { fixture, points: [], parseError: error.code, fileSha256, trackHash: null };
  }
}
