import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TrackParseError } from "./errors";
import { parseGpx } from "./gpx";

const here = dirname(fileURLToPath(import.meta.url));

function gpx(body: string, type?: string): string {
  const typeXml = type ? `<type>${type}</type>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Test" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata><time>2026-10-19T02:30:00Z</time></metadata>
  <trk><name>Test</name>${typeXml}<trkseg>${body}</trkseg></trk>
</gpx>`;
}

function point(lat: string, lon: string, time: string | null, extra = ""): string {
  const timeXml = time ? `<time>${time}</time>` : "";
  return `<trkpt lat="${lat}" lon="${lon}"><ele>4.0</ele>${timeXml}${extra}</trkpt>`;
}

describe("parseGpx", () => {
  it("reads Garmin half-cadence as steps per minute and keeps heart rate", () => {
    const parsed = parseGpx(
      gpx(
        point(
          "25.1931380",
          "55.2309970",
          "2026-10-19T02:30:00Z",
          `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>152</gpxtpx:hr><gpxtpx:cad>85</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>`,
        ),
        "running",
      ),
    );
    expect(parsed.sport).toBe("running");
    expect(parsed.points).toEqual([
      {
        t: Date.parse("2026-10-19T02:30:00Z"),
        lat: 25.193138,
        lon: 55.230997,
        ele: 4,
        hr: 152,
        cad: 170,
      },
    ]);
  });

  it("keeps Apple Watch cadence that is already in steps per minute", () => {
    const parsed = parseGpx(
      gpx(
        point(
          "25.1900000",
          "55.2200000",
          "2026-10-19T02:30:01.000Z",
          `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>160</gpxtpx:hr><gpxtpx:cad>168</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>`,
        ),
        "Running",
      ),
    );
    expect(parsed.sport).toBe("running");
    expect(parsed.points[0]?.cad).toBe(168);
    expect(parsed.points[0]?.hr).toBe(160);
  });

  it("reads a prefixed heart-rate extension and a cycling type", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk><type>E-Bike Ride</type><trkseg>
    <trkpt lat="25.1800000" lon="55.2100000">
      <time>2026-10-19T02:31:00+04:00</time>
      <extensions><ns3:TrackPointExtension><ns3:hr>130</ns3:hr><ns3:cad>90</ns3:cad></ns3:TrackPointExtension></extensions>
    </trkpt>
  </trkseg></trk>
</gpx>`;
    const parsed = parseGpx(xml);
    expect(parsed.sport).toBe("cycling");
    expect(parsed.points[0]?.hr).toBe(130);
    expect(parsed.points[0]?.cad).toBe(90);
    expect(parsed.points[0]?.t).toBe(Date.parse("2026-10-19T02:31:00+04:00"));
  });

  it("maps hiking to other and leaves cadence untouched when the sport is not running", () => {
    const parsed = parseGpx(
      gpx(
        point(
          "25.1800000",
          "55.2100000",
          "2026-10-19T02:30:00Z",
          `<extensions><gpxtpx:TrackPointExtension><gpxtpx:cad>80</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions>`,
        ),
        "hiking",
      ),
    );
    expect(parsed.sport).toBe("other");
    expect(parsed.points[0]?.cad).toBe(80);
  });

  it("omits sport when the track has no type", () => {
    const parsed = parseGpx(gpx(point("25.1800000", "55.2100000", "2026-10-19T02:30:00Z")));
    expect(parsed.sport).toBeUndefined();
    expect(parsed.points).toHaveLength(1);
  });

  it("keeps the file order instead of sorting by time", () => {
    const parsed = parseGpx(
      gpx(
        [
          point("25.1800000", "55.2100000", "2026-10-19T02:30:02Z"),
          point("25.1801000", "55.2101000", "2026-10-19T02:30:01Z"),
        ].join(""),
        "running",
      ),
    );
    const [first, second] = parsed.points;
    expect(first?.t).toBeGreaterThan(second?.t ?? 0);
    expect(first?.lat).toBeCloseTo(25.18, 6);
  });

  it("throws NO_TIMESTAMPS when a point has no time, even if metadata has one", () => {
    expect(() => parseGpx(gpx(point("25.1800000", "55.2100000", null), "running"))).toThrow(
      TrackParseError,
    );
    try {
      parseGpx(gpx(point("25.1800000", "55.2100000", null), "running"));
    } catch (error) {
      expect(error).toBeInstanceOf(TrackParseError);
      expect((error as TrackParseError).code).toBe("NO_TIMESTAMPS");
    }
  });

  it("throws NO_TIMESTAMPS when any point in the track has no time", () => {
    const xml = gpx(
      [
        point("25.1800000", "55.2100000", "2026-10-19T02:30:00Z"),
        point("25.1801000", "55.2101000", null),
      ].join(""),
      "running",
    );
    expect(() => parseGpx(xml)).toThrow(TrackParseError);
  });

  it("throws NO_TIMESTAMPS when the timestamp has no timezone", () => {
    expect(() => parseGpx(gpx(point("25.1800000", "55.2100000", "2026-10-19T02:30:00")))).toThrow(
      TrackParseError,
    );
  });

  it("throws INVALID_FILE for empty input, broken XML, and a track with no points", () => {
    expect(() => parseGpx("")).toThrow(TrackParseError);
    expect(() => parseGpx("<gpx><trk></not-gpx>")).toThrow(TrackParseError);
    try {
      parseGpx("<gpx></gpx>");
    } catch (error) {
      expect((error as TrackParseError).code).toBe("INVALID_FILE");
    }
    try {
      parseGpx("nope");
    } catch (error) {
      expect((error as TrackParseError).code).toBe("INVALID_FILE");
    }
  });

  it("throws INVALID_FILE when a track point has no coordinates", () => {
    const xml = gpx(`<trkpt><time>2026-10-19T02:30:00Z</time></trkpt>`, "running");
    try {
      parseGpx(xml);
      expect.unreachable();
    } catch (error) {
      expect((error as TrackParseError).code).toBe("INVALID_FILE");
    }
  });

  it("parses a 3 hour, 1 Hz GPX in under 300 ms", () => {
    const count = 3 * 60 * 60;
    const start = Date.parse("2026-10-19T02:30:00Z");
    const chunks: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><type>running</type><trkseg>`,
    ];
    for (let i = 0; i < count; i += 1) {
      const lat = (25.15 + (i % 4000) * 0.00001).toFixed(5);
      const lon = (55.2 + (i % 4000) * 0.00001).toFixed(5);
      chunks.push(
        `<trkpt lat="${lat}" lon="${lon}"><time>${new Date(start + i * 1000).toISOString()}</time></trkpt>`,
      );
    }
    chunks.push(`</trkseg></trk></gpx>`);
    const xml = chunks.join("");

    const warmup = parseGpx(xml);
    expect(warmup.points).toHaveLength(count);
    expect(warmup.sport).toBe("running");

    let best = Number.POSITIVE_INFINITY;
    for (let run = 0; run < 3; run += 1) {
      const t0 = performance.now();
      const parsed = parseGpx(xml);
      best = Math.min(best, performance.now() - t0);
      expect(parsed.points).toHaveLength(count);
      expect(parsed.points[count - 1]?.t).toBe(start + (count - 1) * 1000);
    }
    // Under 300 ms locally on POSIX (750 ms on Windows). GitHub Actions runners
    // occasionally experience CPU contention from noisy neighbors (e.g. ~330 ms),
    // so allow a documented threshold of 500 ms when process.env.CI is set.
    const threshold = process.platform === "win32" ? 750 : process.env.CI ? 500 : 300;
    expect(best).toBeLessThan(threshold);
  });

  it("does not use the DOM or Node file APIs", () => {
    for (const name of ["gpx.ts", "sport.ts", "errors.ts", "types.ts"]) {
      const source = readFileSync(join(here, name), "utf8");
      expect(source).not.toMatch(
        /\b(DOMParser|document|window|localStorage|node:fs|node:buffer)\b/,
      );
    }
  });
});
