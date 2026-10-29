import { describe, expect, it } from "vitest";
import { Constants, type Database } from "../../../../supabase/database.types";
import { ACTIVITY_PROVIDERS, RUN_SOURCES } from "../runs/source";

type PublicFunctions = Database["public"]["Functions"];
type IsAdminGone = "is_admin" extends keyof PublicFunctions ? never : true;

describe("generated database types", () => {
  it("matches the phase-0 enums, with Strava left out", () => {
    expect(Constants.public.Enums.run_source).toEqual([...RUN_SOURCES]);
    expect(Constants.public.Enums.activity_provider).toEqual([...ACTIVITY_PROVIDERS]);
    expect(Constants.public.Enums.run_source).not.toContain("strava");
    expect(Constants.public.Enums.activity_provider).not.toContain("strava");
  });

  it("does not publish is_admin as a public RPC", () => {
    const isAdminIsNotAnRpc: IsAdminGone = true;
    expect(isAdminIsNotAnRpc).toBe(true);
  });
});
