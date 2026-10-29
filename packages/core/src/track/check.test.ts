import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { RawPoint } from "../parse/types";
import { TRACK_H3_RESOLUTION, cellsForZone } from "../index";
import { jumeirahKiteZone } from "../zones/registry";
import { assessRun } from "./assess";
import { REASON } from "./check";
import { requireZonePolygon, traceCenterline } from "./trace";

const polygon = requireZonePolygon();
const zoneCells = cellsForZone(jumeirahKiteZone);
const now = Date.UTC(2026, 9, 19, 6, 0, 0);

describe("checkRun", () => {
  it("sends a sub-2:40 kilometre to review and accepts it when the threshold moves", async () => {
    const fast = traceCenterline({ distanceM: 1_200, paceSPerKm: 150 });
    await expectReason(fast, "running", {}, "review", REASON.IMPOSSIBLE_PACE);
    const relaxed = await assessRun(
      base(fast, "running", { impossiblePaceS: 100, bikeMedianSpeedMps: 100 }),
    );
    expect(relaxed.status).toBe("accepted");
    expect(relaxed.reason).toBeNull();
  });

  it("reviews a steady ride labelled as running, and low cadence at a running-plus speed", async () => {
    const ride = traceCenterline({ distanceM: 2_000, paceSPerKm: 170 });
    await expectReason(ride, "running", {}, "review", REASON.BIKE_PATTERN);
    const spinning = traceCenterline({ distanceM: 1_500, paceSPerKm: 220 }).map((point) => ({
      ...point,
      cad: 90,
    }));
    await expectReason(spinning, "running", {}, "review", REASON.BIKE_PATTERN);
  });

  it("reviews a fast run whose cadence is outside 140–220", async () => {
    const points = traceCenterline({ distanceM: 1_500, paceSPerKm: 200 }).map((point) => ({
      ...point,
      cad: 130,
    }));
    await expectReason(points, "running", {}, "review", REASON.CADENCE);
  });

  it("rejects a declared bike, a late upload, a future point, a fourth run and an overlap", async () => {
    const run = traceCenterline({ distanceM: 1_500, paceSPerKm: 300 });
    await expectReason(run, "cycling", {}, "rejected", REASON.NOT_RUNNING);

    const late = await assessRun({
      ...base(run, "running"),
      context: { ...context(), uploadedAt: now + 73 * 60 * 60 * 1000 },
    });
    expect(late.reason).toBe(REASON.OUT_OF_WINDOW);

    const onTime = await assessRun({
      ...base(run, "running"),
      context: {
        ...context(),
        uploadedAt: (run.at(-1)?.t ?? now) + 72 * 60 * 60 * 1000,
      },
    });
    expect(onTime.reason).toBeNull();

    const future = run.map((point) => ({ ...point, t: point.t + 400 * 24 * 60 * 60 * 1000 }));
    await expectReason(future, "running", {}, "rejected", REASON.OUT_OF_WINDOW);

    const crowded = await assessRun({
      ...base(run, "running"),
      context: { ...context(), runsToday: 3 },
    });
    expect(crowded.reason).toBe(REASON.RATE_LIMIT);

    const openLimit = await assessRun({
      ...base(run, "running"),
      config: { maxRunsPerDay: 0 },
    });
    expect(openLimit.reason).toBe(REASON.RATE_LIMIT);

    const startedAt = run[0]?.t ?? 0;
    const endedAt = run.at(-1)?.t ?? 0;
    const overlap = await assessRun({
      ...base(run, "running"),
      context: { ...context(), ownRuns: [{ startedAt: startedAt + 1_000, endedAt }] },
    });
    expect(overlap.reason).toBe(REASON.DUPLICATE);

    const touching = await assessRun({
      ...base(run, "running"),
      context: { ...context(), ownRuns: [{ startedAt: endedAt, endedAt: endedAt + 60_000 }] },
    });
    expect(touching.reason).toBeNull();
  });

  it("rejects a sparse track and a track that is mostly spikes", async () => {
    const sparse = traceCenterline({ distanceM: 1_500, paceSPerKm: 300, everyS: 20 });
    await expectReason(sparse, "running", {}, "rejected", REASON.LOW_DENSITY);

    const dense = traceCenterline({ distanceM: 400, paceSPerKm: 300 });
    const spiked = dense.map((point, index) =>
      index % 10 === 5 ? { ...point, lon: point.lon + 0.0004 } : point,
    );
    await expectReason(spiked, "running", {}, "rejected", REASON.GPS_SPIKES);
  });

  it("rejects a repeat of the file hash before it reviews a copied track", async () => {
    const run = traceCenterline({ distanceM: 1_500, paceSPerKm: 300 });
    const first = await assessRun(base(run, "running"));
    const sameFile = await assessRun({
      ...base(run, "running"),
      context: {
        ...context(),
        ownFileHashes: [base(run, "running").fileSha256],
        knownTracks: [{ trackHash: first.trackHash ?? "", userId: "runner-b" }],
      },
    });
    expect(sameFile.reason).toBe(REASON.DUPLICATE);
    expect(sameFile.approxCells).toBe(0);

    const copied = await assessRun({
      ...base(run, "running", undefined, "file-b"),
      context: {
        ...context(),
        knownTracks: [{ trackHash: first.trackHash ?? "", userId: "runner-b" }],
      },
    });
    expect(copied.status).toBe("review");
    expect(copied.reason).toBe(REASON.COPIED_TRACK);
    expect(copied.approxCells).toBe(0);
    expect(copied.efforts.length).toBeGreaterThan(0);
  });

  it("uses the active season when one is provided", async () => {
    const run = traceCenterline({ distanceM: 1_500, paceSPerKm: 300 });
    const startedAt = run[0]?.t ?? 0;
    const outside = await assessRun({
      ...base(run, "running"),
      context: {
        ...context(),
        season: { startsAt: startedAt + 86_400_000, endsAt: startedAt + 172_800_000 },
      },
    });
    expect(outside.reason).toBe(REASON.OUT_OF_WINDOW);

    const inside = await assessRun({
      ...base(run, "running"),
      context: {
        ...context(),
        season: { startsAt: startedAt - 1_000, endsAt: startedAt + 86_400_000 },
      },
    });
    expect(inside.reason).toBeNull();
  });

  it("accepts a short run without cells", async () => {
    const run = traceCenterline({ distanceM: 800, paceSPerKm: 300 });
    const result = await assessRun(base(run, "running"));
    expect(result.status).toBe("accepted");
    expect(result.reason).toBe(REASON.TOO_SHORT);
    expect(result.approxCells).toBe(0);
    expect(result.efforts).toEqual([]);
  });
});

function context() {
  return {
    now,
    uploadedAt: now,
    userId: "runner-a",
    ownFileHashes: [] as string[],
    ownRuns: [] as { startedAt: number; endedAt: number }[],
    knownTracks: [] as { trackHash: string; userId: string }[],
    runsToday: 0,
  };
}

function base(
  points: RawPoint[],
  sport: "running" | "cycling",
  config?: { impossiblePaceS?: number; maxRunsPerDay?: number; bikeMedianSpeedMps?: number },
  file = "file-a",
) {
  return {
    points,
    source: "upload" as const,
    sport,
    polygon,
    zoneCells,
    resolution: TRACK_H3_RESOLUTION,
    fileSha256: createHash("sha256").update(file).digest("hex"),
    context: context(),
    config,
  };
}

async function expectReason(
  points: RawPoint[],
  sport: "running" | "cycling",
  config: { impossiblePaceS?: number; maxRunsPerDay?: number; bikeMedianSpeedMps?: number },
  status: "accepted" | "review" | "rejected",
  reason: string,
) {
  const result = await assessRun(base(points, sport, config));
  expect(result.status).toBe(status);
  expect(result.reason).toBe(reason);
}
