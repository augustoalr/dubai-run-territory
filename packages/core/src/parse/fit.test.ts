import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Encoder, Profile } from "@garmin/fitsdk";
import { describe, expect, it } from "vitest";
import { TrackParseError } from "./errors";
import { parseFit, semicirclesToDegrees } from "./fit";

const here = dirname(fileURLToPath(import.meta.url));

function toSemi(degrees: number): number {
  return Math.round((degrees * 2 ** 31) / 180);
}

function mesgNum(name: string): number {
  const value = Profile.MesgNum[name];
  if (value === undefined) throw new Error(`unknown FIT message ${name}`);
  return value;
}

/** The SDK types `mesgNum` as a literal union. A runtime number needs a cast. */
function write(encoder: Encoder, mesg: object): void {
  encoder.writeMesg(mesg as Parameters<Encoder["writeMesg"]>[0]);
}

function encodeFit(options: {
  sport?: string;
  records?: {
    lat?: number;
    lon?: number;
    t: Date;
    hr?: number;
    cad?: number;
    fractional?: number;
  }[];
}): Uint8Array {
  const start = options.records?.[0]?.t ?? new Date("2026-10-19T02:30:00Z");
  const end = options.records?.at(-1)?.t ?? start;
  const elapsed = (end.getTime() - start.getTime()) / 1000;
  const encoder = new Encoder();
  write(encoder, {
    mesgNum: mesgNum("FILE_ID"),
    type: "activity",
    manufacturer: "development",
    product: 0,
    timeCreated: start,
    serialNumber: 1,
  });
  for (const record of options.records ?? []) {
    const message: {
      mesgNum: number;
      timestamp: Date;
      heartRate?: number;
      cadence?: number;
      fractionalCadence?: number;
      positionLat?: number;
      positionLong?: number;
    } = {
      mesgNum: mesgNum("RECORD"),
      timestamp: record.t,
    };
    if (record.hr !== undefined) message.heartRate = record.hr;
    if (record.cad !== undefined) message.cadence = record.cad;
    if (record.fractional !== undefined) message.fractionalCadence = record.fractional;
    if (record.lat !== undefined && record.lon !== undefined) {
      message.positionLat = toSemi(record.lat);
      message.positionLong = toSemi(record.lon);
    }
    write(encoder, message);
  }
  if (options.sport) {
    write(encoder, {
      mesgNum: mesgNum("SESSION"),
      messageIndex: 0,
      timestamp: end,
      startTime: start,
      totalElapsedTime: elapsed,
      totalTimerTime: elapsed,
      sport: options.sport,
      subSport: "generic",
      firstLapIndex: 0,
      numLaps: 1,
    });
  }
  write(encoder, {
    mesgNum: mesgNum("ACTIVITY"),
    timestamp: end,
    numSessions: options.sport ? 1 : 0,
    totalTimerTime: elapsed,
  });
  return encoder.close();
}

describe("parseFit", () => {
  it("converts semicircles to degrees and running cadence to steps per minute", () => {
    const lat = 25.193138;
    const lon = 55.230997;
    const semiLat = toSemi(lat);
    const bytes = encodeFit({
      sport: "running",
      records: [
        {
          lat,
          lon,
          t: new Date("2026-10-19T02:30:00Z"),
          hr: 152,
          cad: 85,
          fractional: 0.5,
        },
      ],
    });
    const parsed = parseFit(bytes);
    expect(parsed.sport).toBe("running");
    expect(parsed.points).toHaveLength(1);
    const point = parsed.points[0];
    expect(point?.lat).toBe(semicirclesToDegrees(semiLat));
    expect(point?.lat).toBe((semiLat * 180) / 2 ** 31);
    expect(point?.lon).toBeCloseTo(lon, 5);
    expect(point?.t).toBe(Date.parse("2026-10-19T02:30:00Z"));
    expect(point?.hr).toBe(152);
    expect(point?.cad).toBe(171);
  });

  it("keeps cycling cadence in revolutions and maps e-bike to cycling", () => {
    const cycling = parseFit(
      encodeFit({
        sport: "cycling",
        records: [
          { lat: 25.19, lon: 55.22, t: new Date("2026-10-19T02:30:00Z"), cad: 88, hr: 138 },
        ],
      }),
    );
    expect(cycling.sport).toBe("cycling");
    expect(cycling.points[0]?.cad).toBe(88);

    const ebike = parseFit(
      encodeFit({
        sport: "eBiking",
        records: [{ lat: 25.19, lon: 55.22, t: new Date("2026-10-19T02:30:00Z"), cad: 70 }],
      }),
    );
    expect(ebike.sport).toBe("cycling");
    expect(ebike.points[0]?.cad).toBe(70);
  });

  it("exposes a generic FIT sport as other", () => {
    const parsed = parseFit(
      encodeFit({
        sport: "generic",
        records: [{ lat: 25.19, lon: 55.22, t: new Date("2026-10-19T02:30:00Z"), cad: 85 }],
      }),
    );
    expect(parsed.sport).toBe("other");
    expect(parsed.points[0]?.cad).toBe(170);
  });

  it("skips records that have no GPS fix and still reads the ones that do", () => {
    const parsed = parseFit(
      encodeFit({
        sport: "running",
        records: [
          { t: new Date("2026-10-19T02:30:00Z"), hr: 140 },
          { lat: 25.19, lon: 55.22, t: new Date("2026-10-19T02:30:05Z"), hr: 148, cad: 86 },
        ],
      }),
    );
    expect(parsed.points).toHaveLength(1);
    expect(parsed.points[0]?.hr).toBe(148);
    expect(parsed.points[0]?.cad).toBe(172);
  });

  it("throws NO_TIMESTAMPS when a valid FIT has no positioned records", () => {
    const bytes = encodeFit({
      sport: "running",
      records: [{ t: new Date("2026-10-19T02:30:00Z"), hr: 140 }],
    });
    try {
      parseFit(bytes);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TrackParseError);
      expect((error as TrackParseError).code).toBe("NO_TIMESTAMPS");
    }
  });

  it("throws INVALID_FILE for an empty payload, random bytes, and a broken CRC", () => {
    expect(() => parseFit(new Uint8Array())).toThrow(TrackParseError);
    try {
      parseFit(new Uint8Array([0x0e, 0x10, 0, 0, 0, 0, 0, 0, 0x2e, 0x46, 0x49, 0x54]));
      expect.unreachable();
    } catch (error) {
      expect((error as TrackParseError).code).toBe("INVALID_FILE");
    }

    const bytes = encodeFit({
      sport: "running",
      records: [{ lat: 25.19, lon: 55.22, t: new Date("2026-10-19T02:30:00Z") }],
    });
    const corrupt = new Uint8Array(bytes);
    const index = corrupt.length - 3;
    const original = corrupt[index];
    if (original === undefined) throw new Error("short fit");
    corrupt[index] = original ^ 0xff;
    try {
      parseFit(corrupt);
      expect.unreachable();
    } catch (error) {
      expect((error as TrackParseError).code).toBe("INVALID_FILE");
    }
  });

  it("does not use the DOM or Node file APIs", () => {
    const source = readFileSync(join(here, "fit.ts"), "utf8");
    expect(source).not.toMatch(
      /\b(DOMParser|document|window|localStorage|node:fs|node:buffer|Buffer)\b/,
    );
  });
});
