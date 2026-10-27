import { describe, expect, it } from "vitest";
import { Constants } from "../../../../supabase/database.types";
import { ACTIVITY_PROVIDERS, RUN_SOURCES } from "../runs/source";

describe("generated database types", () => {
  it("matches the phase-0 enums, with Strava left out", () => {
    expect(Constants.public.Enums.run_source).toEqual([...RUN_SOURCES]);
    expect(Constants.public.Enums.activity_provider).toEqual([...ACTIVITY_PROVIDERS]);
    expect(Constants.public.Enums.run_source).not.toContain("strava");
    expect(Constants.public.Enums.activity_provider).not.toContain("strava");
  });
});
