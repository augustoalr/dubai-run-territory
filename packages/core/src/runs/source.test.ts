import { describe, expect, it } from "vitest";
import { ACTIVITY_PROVIDERS, RUN_SOURCES } from "./source";

describe("run sources", () => {
  it("keeps Strava out of phase 0", () => {
    expect(RUN_SOURCES).toEqual(["upload", "garmin", "polar", "browser"]);
    expect(ACTIVITY_PROVIDERS).toEqual(["garmin", "polar"]);
    expect(RUN_SOURCES).not.toContain("strava");
    expect(ACTIVITY_PROVIDERS).not.toContain("strava");
  });
});
