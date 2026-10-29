import { describe, expect, it } from "vitest";
import { parseCellEfforts } from "../efforts/cell-effort";
import { TRACK_H3_RESOLUTION, cellsForZone, jumeirahKiteZone } from "../index";
import { planRun } from "./process";
import { traceCenterline } from "../track/trace";

const polygon = jumeirahKiteZone.polygon;
if (!polygon) throw new Error("missing polygon");
const zoneCells = cellsForZone(jumeirahKiteZone);
const now = Date.UTC(2026, 9, 19, 6, 0, 0);

describe("planRun", () => {
  it("rejects a declared bike and does not apply cells", async () => {
    const plan = await planRun(
      base(traceCenterline({ distanceM: 2_000, paceSPerKm: 170 }), "cycling"),
    );
    expect(plan.status).toBe("rejected");
    expect(plan.rejectCode).toBe("NOT_RUNNING");
    expect(plan.apply).toBe(false);
    expect(plan.efforts).toEqual([]);
  });

  it("accepts a 5:00/km run, assigns advanced, and keeps efforts that apply_run can store", async () => {
    const plan = await planRun(
      base(traceCenterline({ distanceM: 5_000, paceSPerKm: 300 }), "running"),
    );
    expect(plan.status).toBe("accepted");
    expect(plan.rejectCode).toBeNull();
    expect(plan.apply).toBe(true);
    expect(plan.league).toBe("advanced");
    expect(plan.leagueReason).toBe("provisional");
    expect(plan.refPaceS).toBe(300);
    expect(plan.efforts.length).toBeGreaterThan(40);
    expect(parseCellEfforts(plan.efforts)).toEqual(plan.efforts);
  });

  it("promotes immediately and does not demote a slow run", async () => {
    const promoted = await planRun({
      ...base(traceCenterline({ distanceM: 1_500, paceSPerKm: 240 }), "running"),
      currentLeague: "starter",
    });
    expect(promoted.league).toBe("elite");
    expect(promoted.leagueReason).toBe("promotion");
    expect(promoted.apply).toBe(true);

    const held = await planRun({
      ...base(traceCenterline({ distanceM: 1_500, paceSPerKm: 390 }), "running"),
      currentLeague: "elite",
    });
    expect(held.league).toBe("elite");
    expect(held.leagueReason).toBe("held");
    expect(held.apply).toBe(true);
  });

  it("accepts a short run without calling apply_run", async () => {
    const plan = await planRun(
      base(traceCenterline({ distanceM: 800, paceSPerKm: 300 }), "running"),
    );
    expect(plan.status).toBe("accepted");
    expect(plan.rejectCode).toBe("TOO_SHORT");
    expect(plan.apply).toBe(false);
  });

  it("rejects a file without timestamps", async () => {
    const plan = await planRun({
      ...base([], "running"),
      parseError: "NO_TIMESTAMPS",
    });
    expect(plan.status).toBe("rejected");
    expect(plan.rejectCode).toBe("NO_TIMESTAMPS");
    expect(plan.apply).toBe(false);
  });
});

function base(points: ReturnType<typeof traceCenterline>, sport: "running" | "cycling") {
  return {
    points,
    source: "upload" as const,
    sport,
    polygon: polygon!,
    zoneCells,
    resolution: TRACK_H3_RESOLUTION,
    fileSha256: "a".repeat(64),
    currentLeague: null,
    context: {
      now,
      uploadedAt: now,
      userId: "runner-a",
      ownFileHashes: [],
      ownRuns: [],
      knownTracks: [],
      runsToday: 0,
    },
  };
}
