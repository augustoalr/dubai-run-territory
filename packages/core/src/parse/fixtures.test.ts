import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Decoder, Stream } from "@garmin/fitsdk";
import { latLngToCell } from "h3-js";
import { describe, expect, it } from "vitest";
import {
  TRACK_H3_RESOLUTION,
  TrackParseError,
  assignLeague,
  cellsForZone,
  distanceToPolylineMeters,
  haversineMeters,
  jumeirahKiteZone,
  parseFit,
  parseGpx,
  type ParsedActivity,
} from "../index";

type FixtureExpectation = {
  id: string;
  file: string;
  format: "gpx" | "fit";
  source: "garmin-connect" | "strava" | "apple-watch" | "garmin-fit";
  sport: "running" | "cycling" | null;
  league: "elite" | "advanced" | "intermediate" | "starter" | null;
  status: "accepted" | "review" | "rejected";
  reason: string | null;
  approxCells: number;
  cellsTouched: number;
  scoringCells: number;
  distanceM: number;
  paceSPerKm: number | null;
  speedKmh: number | null;
  pointCount: number;
  startedAt: string;
  segmentCount: number;
  duplicateOf: string | null;
  sameTrackAs: string | null;
  offTrackPoints: number;
  throws: "NO_TIMESTAMPS" | null;
  first: { lat: number; lon: number; tMs: number; cad: number; hr: number } | null;
  notes: string;
};

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures");
const centerline = trackLine();
const zoneCells = new Set(cellsForZone(jumeirahKiteZone));

function trackLine() {
  const line = jumeirahKiteZone.centerline?.coordinates;
  if (!line || line.length < 2) throw new Error("missing centerline");
  return line;
}

const fixtures: FixtureExpectation[] = readdirSync(fixturesDir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as FixtureExpectation);

function byId(id: string): FixtureExpectation {
  const found = fixtures.find((fixture) => fixture.id === id);
  if (!found) throw new Error(`missing fixture ${id}`);
  return found;
}

function readFixture(file: string): Buffer {
  return readFileSync(join(fixturesDir, file));
}

function cellsOf(points: readonly { lat: number; lon: number }[]): number {
  const seen = new Set<string>();
  for (const point of points) {
    const cell = latLngToCell(point.lat, point.lon, TRACK_H3_RESOLUTION);
    if (zoneCells.has(cell)) seen.add(cell);
  }
  return seen.size;
}

function gpxCoordinates(xml: string): { lat: number; lon: number }[] {
  const found: { lat: number; lon: number }[] = [];
  const pattern = /<trkpt lat="([^"]+)" lon="([^"]+)"/g;
  for (const match of xml.matchAll(pattern)) {
    const lat = match[1];
    const lon = match[2];
    if (!lat || !lon) continue;
    found.push({ lat: Number(lat), lon: Number(lon) });
  }
  return found;
}

function trackPointXml(xml: string): string {
  const start = xml.indexOf("<trkpt ");
  const end = xml.lastIndexOf("</trkpt>");
  if (start < 0 || end < 0) throw new Error("no trkpt");
  return xml.slice(start, end + "</trkpt>".length);
}

describe("Jumeirah · Kite fixtures", () => {
  it("covers a run in each league, a bike, a jump, a pause, a cycling FIT and a duplicate", () => {
    expect(fixtures.map((fixture) => fixture.id).sort()).toEqual([
      "bike-30kmh",
      "bike-cycling",
      "copied-track",
      "duplicate-advanced",
      "future-date",
      "gps-spike",
      "no-timestamps",
      "pause-2min",
      "run-advanced",
      "run-advanced-5min",
      "run-elite-4min",
      "run-intermediate-5min45",
      "run-starter-6min30",
      "short-under-1km",
      "teleport-500m",
    ]);

    const acceptedRuns = fixtures.filter(
      (fixture) =>
        fixture.status === "accepted" && fixture.reason === null && fixture.sport === "running",
    );
    expect(new Set(acceptedRuns.map((fixture) => fixture.league))).toEqual(
      new Set(["elite", "advanced", "intermediate", "starter"]),
    );
    expect(byId("bike-30kmh").sport).toBe("cycling");
    expect(byId("bike-cycling").format).toBe("fit");
    expect(byId("duplicate-advanced").duplicateOf).toBe("run-advanced-5min");
    expect(new Set(fixtures.map((fixture) => fixture.source))).toEqual(
      new Set(["garmin-connect", "strava", "apple-watch", "garmin-fit"]),
    );
  });

  it("states the anti-cheat result T-10 will have to reproduce", () => {
    expect(byId("run-elite-4min")).toMatchObject({
      status: "accepted",
      reason: null,
      paceSPerKm: 240,
      distanceM: 5000,
      pointCount: 1201,
      segmentCount: 1,
    });
    expect(byId("run-advanced-5min")).toMatchObject({
      status: "accepted",
      reason: null,
      paceSPerKm: 300,
      distanceM: 5000,
      pointCount: 1501,
    });
    expect(byId("run-intermediate-5min45")).toMatchObject({
      paceSPerKm: 345,
      pointCount: 1726,
      league: "intermediate",
    });
    expect(byId("run-starter-6min30")).toMatchObject({
      paceSPerKm: 390,
      pointCount: 1951,
      league: "starter",
    });
    expect(byId("bike-30kmh")).toMatchObject({
      status: "rejected",
      reason: "NOT_RUNNING",
      speedKmh: 30,
      pointCount: 601,
      approxCells: 0,
    });
    expect(byId("bike-cycling")).toMatchObject({
      status: "rejected",
      reason: "NOT_RUNNING",
      speedKmh: 30,
      pointCount: 601,
      format: "fit",
    });
    expect(byId("teleport-500m")).toMatchObject({
      status: "accepted",
      reason: null,
      segmentCount: 2,
      distanceM: 5000,
    });
    expect(byId("pause-2min")).toMatchObject({
      status: "accepted",
      reason: null,
      segmentCount: 2,
      pointCount: 1502,
    });
    expect(byId("gps-spike")).toMatchObject({
      status: "accepted",
      reason: null,
      segmentCount: 1,
      offTrackPoints: 1,
    });
    expect(byId("future-date")).toMatchObject({ status: "rejected", reason: "OUT_OF_WINDOW" });
    expect(byId("short-under-1km")).toMatchObject({
      status: "accepted",
      reason: "TOO_SHORT",
      distanceM: 800,
      pointCount: 241,
      approxCells: 0,
      scoringCells: 0,
    });
    expect(byId("duplicate-advanced")).toMatchObject({ status: "rejected", reason: "DUPLICATE" });
    expect(byId("copied-track")).toMatchObject({ status: "review", reason: "COPIED_TRACK" });
    expect(byId("no-timestamps")).toMatchObject({
      status: "rejected",
      reason: "NO_TIMESTAMPS",
      throws: "NO_TIMESTAMPS",
    });
    expect(byId("run-advanced")).toMatchObject({
      format: "fit",
      sport: "running",
      status: "accepted",
      pointCount: 1501,
    });

    for (const fixture of fixtures) {
      if (fixture.league && fixture.paceSPerKm) {
        expect(assignLeague(fixture.paceSPerKm)).toBe(fixture.league);
      }
      if (fixture.status === "accepted") {
        expect(fixture.approxCells).toBe(fixture.scoringCells);
      } else {
        expect(fixture.approxCells).toBe(0);
      }
      expect(fixture.notes.length).toBeGreaterThan(20);
    }

    const scored = fixtures.filter((fixture) => fixture.approxCells > 0);
    for (const fixture of scored) {
      expect(fixture.approxCells).toBeGreaterThan(40);
      expect(fixture.approxCells).toBeLessThanOrEqual(zoneCells.size);
    }
    expect(byId("short-under-1km").cellsTouched).toBeGreaterThan(0);
  });

  it("keeps the 5 km tracks on the same cells, apart from the jump and the spike", () => {
    const samePath = [
      "run-elite-4min",
      "run-advanced-5min",
      "run-intermediate-5min45",
      "run-starter-6min30",
      "bike-30kmh",
      "pause-2min",
      "future-date",
      "duplicate-advanced",
      "copied-track",
      "no-timestamps",
    ];
    const counts = samePath.map((id) => byId(id).cellsTouched);
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBeGreaterThan(40);
  });

  it("duplicates the file bytes and copies the track without copying the file hash", () => {
    const original = readFixture("run-advanced-5min.gpx");
    const duplicate = readFixture("duplicate-advanced.gpx");
    const copied = readFixture("copied-track.gpx");
    const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
    expect(hash(duplicate)).toBe(hash(original));
    expect(hash(copied)).not.toBe(hash(original));
    const originalXml = original.toString("utf8");
    const copiedXml = copied.toString("utf8");
    expect(trackPointXml(copiedXml)).toBe(trackPointXml(originalXml));
    expect(copiedXml).toContain('creator="OtherExport"');
    expect(copiedXml).toContain("<name>Copied activity</name>");
  });

  it("rejects a GPX whose points have no time even when metadata has one", () => {
    const xml = readFixture("no-timestamps.gpx").toString("utf8");
    const trackAt = xml.indexOf("<trk>");
    expect(xml.slice(0, trackAt)).toContain("<time>");
    expect(xml.slice(trackAt)).not.toContain("<time>");
    expect(gpxCoordinates(xml)).toHaveLength(byId("no-timestamps").pointCount);
    expect(() => parseGpx(xml)).toThrow(TrackParseError);
    try {
      parseGpx(xml);
    } catch (error) {
      expect((error as TrackParseError).code).toBe("NO_TIMESTAMPS");
    }
  });

  describe.each(fixtures)("$id", (fixture) => {
    it("parses into the shared point format and stays on the track", () => {
      const bytes = readFixture(fixture.file);
      if (fixture.format === "gpx") {
        const xml = bytes.toString("utf8");
        const coordinates = gpxCoordinates(xml);
        expect(coordinates).toHaveLength(fixture.pointCount);
        expect(cellsOf(coordinates)).toBe(fixture.cellsTouched);
        expect(xml).toContain("<gpxtpx:hr>");
        expect(xml).toContain("<gpxtpx:cad>");
        if (fixture.throws) return;

        const parsed = parseGpx(xml);
        expectActivity(parsed, fixture);
        expect(parsed.points).toHaveLength(coordinates.length);
        for (let i = 0; i < coordinates.length; i += 1) {
          expect(parsed.points[i]?.lat).toBe(coordinates[i]?.lat);
          expect(parsed.points[i]?.lon).toBe(coordinates[i]?.lon);
        }
        expectNearTrack(parsed, fixture);
        return;
      }

      const parsed = parseFit(new Uint8Array(bytes));
      expectActivity(parsed, fixture);
      expect(cellsOf(parsed.points)).toBe(fixture.cellsTouched);
      expectFitSemicircles(bytes, parsed);
      expectNearTrack(parsed, fixture);
    });
  });

  it("encodes the jump, the pause and the spike as those cases", () => {
    const jump = parseGpx(readFixture("teleport-500m.gpx").toString("utf8"));
    expect(maxStepMeters(jump)).toBeGreaterThan(490);
    expect(maxStepMeters(jump)).toBeLessThan(520);
    expect(maxGapMs(jump)).toBeLessThan(2_000);

    const pause = parseGpx(readFixture("pause-2min.gpx").toString("utf8"));
    expect(maxGapMs(pause)).toBe(120_000);
    expect(maxStepMeters(pause)).toBeLessThan(20);

    const spike = parseGpx(readFixture("gps-spike.gpx").toString("utf8"));
    const distances = spike.points.map((point) =>
      distanceToPolylineMeters([point.lon, point.lat], centerline),
    );
    const off = distances.filter((distance) => distance > 20);
    expect(off).toHaveLength(1);
    expect(off[0]).toBeGreaterThan(25);
    expect(off[0]).toBeLessThan(90);
    expect(maxStepMeters(spike)).toBeGreaterThan(12);
    expect(maxStepMeters(spike)).toBeLessThan(100);

    const future = parseGpx(readFixture("future-date.gpx").toString("utf8"));
    expect(future.points[0]?.t).toBeGreaterThan(Date.UTC(2027, 0, 1));
  });
});

function expectActivity(parsed: ParsedActivity, fixture: FixtureExpectation): void {
  expect(parsed.sport).toBe(fixture.sport ?? undefined);
  expect(parsed.points).toHaveLength(fixture.pointCount);
  const first = parsed.points[0];
  const expected = fixture.first;
  if (!first || !expected) throw new Error(`${fixture.id} has no first point`);
  expect(first.t).toBe(expected.tMs);
  expect(first.t).toBe(Date.parse(fixture.startedAt));
  expect(first.lat).toBeCloseTo(expected.lat, 6);
  expect(first.lon).toBeCloseTo(expected.lon, 6);
  expect(first.cad).toBe(expected.cad);
  expect(first.hr).toBe(expected.hr);
  expect(first.ele).toBeTypeOf("number");
  for (let i = 1; i < parsed.points.length; i += 1) {
    const previous = parsed.points[i - 1];
    const current = parsed.points[i];
    if (!previous || !current) continue;
    expect(current.t).toBeGreaterThan(previous.t);
    expect(Number.isFinite(current.lat)).toBe(true);
    expect(Number.isFinite(current.lon)).toBe(true);
  }
}

function expectNearTrack(parsed: ParsedActivity, fixture: FixtureExpectation): void {
  let off = 0;
  let max = 0;
  for (const point of parsed.points) {
    const distance = distanceToPolylineMeters([point.lon, point.lat], centerline);
    if (distance > 8) off += 1;
    if (distance > max) max = distance;
  }
  expect(off).toBe(fixture.offTrackPoints);
  expect(max).toBeLessThan(120);
}

function expectFitSemicircles(bytes: Buffer, parsed: ParsedActivity): void {
  const { messages } = new Decoder(Stream.fromByteArray(new Uint8Array(bytes))).read();
  const records = (messages.recordMesgs ?? []).filter(
    (record) => typeof record.positionLat === "number" && typeof record.positionLong === "number",
  );
  expect(records).toHaveLength(parsed.points.length);
  const raw = records[0];
  const point = parsed.points[0];
  if (!raw || !point || raw.positionLat === undefined || raw.positionLong === undefined) {
    throw new Error("missing FIT record");
  }
  expect(point.lat).toBe((raw.positionLat * 180) / 2 ** 31);
  expect(point.lon).toBe((raw.positionLong * 180) / 2 ** 31);
  const rpm = (raw.cadence ?? 0) + (raw.fractionalCadence ?? 0);
  expect(point.cad).toBe(parsed.sport === "cycling" ? rpm : rpm * 2);
  expect(messages.sessionMesgs?.[0]?.sport).toBe(parsed.sport);
}

function maxStepMeters(activity: ParsedActivity): number {
  let max = 0;
  for (let i = 1; i < activity.points.length; i += 1) {
    const previous = activity.points[i - 1];
    const current = activity.points[i];
    if (!previous || !current) continue;
    max = Math.max(max, haversineMeters([previous.lon, previous.lat], [current.lon, current.lat]));
  }
  return max;
}

function maxGapMs(activity: ParsedActivity): number {
  let max = 0;
  for (let i = 1; i < activity.points.length; i += 1) {
    const previous = activity.points[i - 1];
    const current = activity.points[i];
    if (!previous || !current) continue;
    max = Math.max(max, current.t - previous.t);
  }
  return max;
}
