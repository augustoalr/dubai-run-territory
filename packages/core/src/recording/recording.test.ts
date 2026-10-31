import { describe, expect, it } from "vitest";
import { parseGpx } from "../parse/gpx";
import { DEFAULT_FILTER_CONFIG, filterRecordedPoints, isValidRecordedPoint } from "./filter";
import { buildGpx } from "./gpx-builder";
import {
  calculateAveragePaceSecondsPerKm,
  calculateCurrentPaceSecondsPerKm,
  calculateDistanceMeters,
  computeRecordingStats,
  formatDisplayDistance,
  formatDisplayDuration,
  formatDisplayPace,
} from "./metrics";
import type { RecordedPoint } from "./types";

describe("Recorded point filtering", () => {
  const baseTime = 1761920000000;
  const startPoint: RecordedPoint = {
    lat: 25.1412,
    lon: 55.1852,
    time: baseTime,
    accuracy: 10,
    ele: 4.5,
  };

  it("exposes default filter thresholds of 30 metres accuracy and 12 m/s speed", () => {
    expect(DEFAULT_FILTER_CONFIG.maxAccuracyMeters).toBe(30);
    expect(DEFAULT_FILTER_CONFIG.maxSpeedMps).toBe(12);
  });

  it("accepts a normal, high-accuracy point", () => {
    expect(isValidRecordedPoint(startPoint)).toBe(true);
  });

  it("discards points with accuracy worse than 30 metres", () => {
    const poorAccuracyPoint: RecordedPoint = {
      ...startPoint,
      accuracy: 31,
    };
    expect(isValidRecordedPoint(poorAccuracyPoint)).toBe(false);

    const exact30mPoint: RecordedPoint = {
      ...startPoint,
      accuracy: 30,
    };
    expect(isValidRecordedPoint(exact30mPoint)).toBe(true);

    const negativeAccuracyPoint: RecordedPoint = {
      ...startPoint,
      accuracy: -5,
    };
    expect(isValidRecordedPoint(negativeAccuracyPoint)).toBe(false);

    const nanAccuracyPoint: RecordedPoint = {
      ...startPoint,
      accuracy: Number.NaN,
    };
    expect(isValidRecordedPoint(nanAccuracyPoint)).toBe(false);
  });

  it("discards impossible jumps and teleports", () => {
    // Moved ~500 m in 1 second (~500 m/s > 12 m/s max)
    const impossibleJumpPoint: RecordedPoint = {
      lat: 25.1455,
      lon: 55.1852,
      time: baseTime + 1000,
      accuracy: 10,
    };
    expect(isValidRecordedPoint(impossibleJumpPoint, startPoint)).toBe(false);

    // Normal running step: ~3 m in 1 second (3 m/s <= 12 m/s)
    const normalRunningPoint: RecordedPoint = {
      lat: 25.141227,
      lon: 55.1852,
      time: baseTime + 1000,
      accuracy: 8,
    };
    expect(isValidRecordedPoint(normalRunningPoint, startPoint)).toBe(true);
  });

  it("discards points where time does not advance", () => {
    const duplicateTimePoint: RecordedPoint = {
      ...startPoint,
      time: baseTime,
    };
    expect(isValidRecordedPoint(duplicateTimePoint, startPoint)).toBe(false);

    const backwardsTimePoint: RecordedPoint = {
      ...startPoint,
      time: baseTime - 1000,
    };
    expect(isValidRecordedPoint(backwardsTimePoint, startPoint)).toBe(false);
  });

  it("filters a sequence of points sequentially", () => {
    const points: RecordedPoint[] = [
      startPoint,
      { lat: 25.141227, lon: 55.1852, time: baseTime + 1000, accuracy: 8 }, // valid (+3m)
      { lat: 25.15, lon: 55.1852, time: baseTime + 2000, accuracy: 8 }, // impossible jump (~1km) -> rejected
      { lat: 25.141254, lon: 55.1852, time: baseTime + 2000, accuracy: 45 }, // poor accuracy (45m) -> rejected
      { lat: 25.141254, lon: 55.1852, time: baseTime + 2000, accuracy: 9 }, // valid (+3m from point 1)
    ];

    const filtered = filterRecordedPoints(points);
    expect(filtered).toHaveLength(3);
    expect(filtered[0]?.time).toBe(baseTime);
    expect(filtered[1]?.time).toBe(baseTime + 1000);
    expect(filtered[2]?.time).toBe(baseTime + 2000);
  });
});

describe("Distance and Pace metrics", () => {
  it("calculates distance correctly", () => {
    const p1: RecordedPoint = { lat: 25.1412, lon: 55.1852, time: 1000 };
    const p2: RecordedPoint = { lat: 25.1412, lon: 55.1852, time: 2000 };
    expect(calculateDistanceMeters([p1, p2])).toBe(0);

    // 1 degree latitude is approx 111,139 m; 0.001 deg is ~111.1 m
    const p3: RecordedPoint = { lat: 25.1422, lon: 55.1852, time: 3000 };
    const dist = calculateDistanceMeters([p1, p3]);
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(112);
  });

  it("calculates average pace in seconds per km and formats correctly", () => {
    // 1000 m in 312 seconds -> 312 s/km -> "5:12 /km"
    const pace = calculateAveragePaceSecondsPerKm(1000, 312);
    expect(pace).toBe(312);
    expect(formatDisplayPace(pace)).toBe("5:12 /km");

    // Negligible distance (< 10m) returns null -> "-:-- /km"
    expect(calculateAveragePaceSecondsPerKm(5, 30)).toBeNull();
    expect(formatDisplayPace(null)).toBe("-:-- /km");
  });

  it("never includes forbidden strings like 's/km' or 'H3'", () => {
    const formatted = formatDisplayPace(312);
    expect(formatted).not.toContain("s/km");
    expect(formatted).not.toContain("H3");
    expect(formatted).toBe("5:12 /km");
  });

  it("calculates current pace over rolling window", () => {
    const baseTime = 100_000;
    // Simulate 100m in 30 seconds (~3.33 m/s = 300 s/km = 5:00/km)
    // 0.0009 degrees latitude is ~100m
    const points: RecordedPoint[] = [
      { lat: 25.14, lon: 55.1852, time: baseTime },
      { lat: 25.1403, lon: 55.1852, time: baseTime + 10_000 },
      { lat: 25.1406, lon: 55.1852, time: baseTime + 20_000 },
      { lat: 25.1409, lon: 55.1852, time: baseTime + 30_000 },
    ];

    const currentPace = calculateCurrentPaceSecondsPerKm(points, 20_000);
    expect(currentPace).not.toBeNull();
    // Pace should be in the ballpark of ~300 s/km (5:00 /km)
    expect(currentPace!).toBeGreaterThanOrEqual(280);
    expect(currentPace!).toBeLessThanOrEqual(320);
  });

  it("computes complete live stats snapshot", () => {
    const baseTime = 100_000;
    const points: RecordedPoint[] = [
      { lat: 25.14, lon: 55.1852, time: baseTime },
      { lat: 25.1409, lon: 55.1852, time: baseTime + 30_000 },
    ];
    const stats = computeRecordingStats(points, 30);
    expect(stats.durationSeconds).toBe(30);
    expect(stats.distanceMeters).toBeGreaterThan(95);
    expect(stats.averagePaceSecondsPerKm).not.toBeNull();
  });

  it("formats display distance and duration", () => {
    expect(formatDisplayDistance(1240)).toBe("1.24 km");
    expect(formatDisplayDistance(50)).toBe("0.05 km");

    expect(formatDisplayDuration(0)).toBe("00:00");
    expect(formatDisplayDuration(65)).toBe("01:05");
    expect(formatDisplayDuration(312)).toBe("05:12");
    expect(formatDisplayDuration(3665)).toBe("1:01:05");
  });
});

describe("GPX generation and parser compatibility", () => {
  it("builds GPX and verifies it parses cleanly with parseGpx", () => {
    const baseTime = 1761920000000; // Fixed UTC timestamp
    const points: RecordedPoint[] = [
      {
        lat: 25.1412,
        lon: 55.1852,
        time: baseTime,
        ele: 5.2,
      },
      {
        lat: 25.1413,
        lon: 55.1853,
        time: baseTime + 5000,
        ele: 5.4,
      },
      {
        lat: 25.1414,
        lon: 55.1854,
        time: baseTime + 10000,
        ele: 5.6,
      },
    ];

    const gpxString = buildGpx(points, { name: "Carrera de prueba Jumeirah" });
    expect(gpxString).toContain('creator="Runners Dubai PWA"');
    expect(gpxString).toContain("<type>running</type>");
    expect(gpxString).toContain('<trkpt lat="25.1412000" lon="55.1852000">');
    expect(gpxString).toContain("<ele>5.2</ele>");

    // Now test that the existing parseGpx parser reads it accurately
    const parsedActivity = parseGpx(gpxString);

    expect(parsedActivity.sport).toBe("running");
    expect(parsedActivity.points).toHaveLength(3);

    const first = parsedActivity.points[0]!;
    expect(first.lat).toBeCloseTo(25.1412, 4);
    expect(first.lon).toBeCloseTo(55.1852, 4);
    expect(first.t).toBe(baseTime);
    expect(first.ele).toBeCloseTo(5.2, 1);

    const last = parsedActivity.points[2]!;
    expect(last.lat).toBeCloseTo(25.1414, 4);
    expect(last.lon).toBeCloseTo(55.1854, 4);
    expect(last.t).toBe(baseTime + 10000);
    expect(last.ele).toBeCloseTo(5.6, 1);
  });
});
