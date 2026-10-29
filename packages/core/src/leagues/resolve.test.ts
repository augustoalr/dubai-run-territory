import { describe, expect, it } from "vitest";
import type { NormalizedPoint, TrackSegment } from "../track/normalize";
import { LEAGUE_BANDS, type LeagueBand } from "./bands";
import { REFERENCE_WINDOW_MS, referencePaceS } from "./reference";
import { resolveLeagueForRun } from "./resolve";
import { bestKmWindow } from "./window";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 2);

describe("bestKmWindow", () => {
  it("returns 4:15/km exactly and nothing under 1 km", () => {
    expect(bestKmWindow([segmentAt(255, 1_200)])).toBe(255);
    expect(bestKmWindow([segmentAt(254, 1_200)])).toBe(254);
    expect(bestKmWindow([segmentAt(300, 800)])).toBeNull();
  });

  it("keeps the faster kilometre when the run slows down", () => {
    const fast = segmentAt(240, 1_200, 0);
    const slow = segmentAt(390, 1_200, fast.endedAt + 60_000);
    expect(bestKmWindow([fast, slow])).toBe(240);
  });
});

describe("assignLeague bands from the seed", () => {
  it("matches the four leagues stored in the seed", () => {
    expect(LEAGUE_BANDS).toEqual([
      { code: "elite", sort: 0, minPaceS: null, maxPaceS: 254 },
      { code: "advanced", sort: 1, minPaceS: 255, maxPaceS: 314 },
      { code: "intermediate", sort: 2, minPaceS: 315, maxPaceS: 374 },
      { code: "starter", sort: 3, minPaceS: 375, maxPaceS: null },
    ]);
  });
});

describe("referencePaceS", () => {
  it("keeps the fastest kilometre inside 60 days and drops the rest", () => {
    const pace = referencePaceS(
      [
        { at: now - 10 * DAY_MS, paceS: 300 },
        { at: now - 20 * DAY_MS, paceS: 240 },
        { at: now - REFERENCE_WINDOW_MS, paceS: 200 },
        { at: now - REFERENCE_WINDOW_MS - 1, paceS: 180 },
        { at: now + DAY_MS, paceS: 160 },
      ],
      now,
    );
    expect(pace).toBe(200);
    expect(referencePaceS([], now)).toBeNull();
  });
});

describe("resolveLeagueForRun", () => {
  it("gives the first run a provisional league from its best kilometre", () => {
    expect(resolveLeagueForRun(null, 255)).toEqual({
      league: "advanced",
      reason: "provisional",
    });
    expect(resolveLeagueForRun(null, 254).league).toBe("elite");
    expect(resolveLeagueForRun(null, 375).league).toBe("starter");
  });

  it("promotes immediately, including a jump of more than one league", () => {
    expect(resolveLeagueForRun("starter", 255)).toEqual({
      league: "advanced",
      reason: "promotion",
    });
    expect(resolveLeagueForRun("starter", 240)).toEqual({
      league: "elite",
      reason: "promotion",
    });
    expect(resolveLeagueForRun("advanced", 255)).toEqual({
      league: "advanced",
      reason: "held",
    });
  });

  it("does not demote mid-season when the run is slow", () => {
    expect(resolveLeagueForRun("elite", 400)).toEqual({
      league: "elite",
      reason: "held",
    });
    expect(resolveLeagueForRun("intermediate", 390)).toEqual({
      league: "intermediate",
      reason: "held",
    });
  });

  it("reassigns from the 60-day pace at season start, demotion included", () => {
    expect(
      resolveLeagueForRun("elite", 240, LEAGUE_BANDS, {
        seasonStart: true,
        referencePaceS: 400,
      }),
    ).toEqual({ league: "starter", reason: "season_start" });
    expect(
      resolveLeagueForRun("elite", 240, LEAGUE_BANDS, {
        seasonStart: true,
        referencePaceS: 255,
      }).league,
    ).toBe("advanced");
  });

  it("reads the bands it is given", () => {
    const onlyFast: LeagueBand[] = [{ code: "elite", sort: 0, minPaceS: null, maxPaceS: null }];
    expect(resolveLeagueForRun(null, 400, onlyFast).league).toBe("elite");
  });
});

function segmentAt(paceS: number, distanceM: number, startMs = 0): TrackSegment {
  const speed = 1000 / paceS;
  const steps = Math.max(1, Math.round(distanceM / speed));
  const points: NormalizedPoint[] = [];
  for (let second = 0; second <= steps; second += 1) {
    const travelled = Math.min(distanceM, second * speed);
    points.push({ t: startMs + second * 1000, lat: 25, lon: 55, distanceM: travelled });
    if (travelled >= distanceM) break;
  }
  const last = points[points.length - 1];
  if (!last) throw new Error("empty segment");
  return { points, distanceM: last.distanceM, startedAt: startMs, endedAt: last.t };
}
