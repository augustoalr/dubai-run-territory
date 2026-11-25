import { describe, expect, it } from "vitest";
import {
  collectUniqueIds,
  normalizeRunFlags,
  normalizeRunSport,
  parseAdminActionBody,
  parseStorageObjectPath,
  subsampleCoordinates,
  UPLOAD_WINDOW_MS,
  validateApprovalWindow,
} from "../../../../../supabase/functions/admin-review/logic";

const VALID_UUID = "11111111-2222-3333-4444-555555555555";

describe("admin-review pure logic", () => {
  it("validates action payloads and reason lengths", () => {
    expect(parseAdminActionBody(null)).toEqual({ ok: false, error: "invalid_body" });
    expect(
      parseAdminActionBody({ action: "delete_all", targetId: VALID_UUID, reason: "test reason" }),
    ).toEqual({ ok: false, error: "invalid_action" });
    expect(
      parseAdminActionBody({
        action: "approve_run",
        targetId: "not-a-uuid",
        reason: "valid reason",
      }),
    ).toEqual({ ok: false, error: "invalid_target_id" });
    expect(
      parseAdminActionBody({ action: "approve_run", targetId: VALID_UUID, reason: "ab" }),
    ).toEqual({ ok: false, error: "invalid_reason" });

    const parsed = parseAdminActionBody({
      action: "approve_run",
      targetId: VALID_UUID,
      reason: "  Verified GPS spike on watch pause  ",
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        action: "approve_run",
        targetId: VALID_UUID,
        reason: "Verified GPS spike on watch pause",
      },
    });
  });

  it("defensively normalizes runs.flags across {flags:[]}, [], and {}", () => {
    expect(normalizeRunFlags({ flags: ["SPIKE", "JUMP", "SPIKE", "", 42] })).toEqual([
      "SPIKE",
      "JUMP",
    ]);
    expect(normalizeRunFlags([" GAP ", "GAP", null])).toEqual(["GAP"]);
    expect(normalizeRunFlags({})).toEqual([]);
    expect(normalizeRunFlags(null)).toEqual([]);
  });

  it("collects unique non-null IDs without passing null to .in()", () => {
    expect(collectUniqueIds([null, undefined, "", "a", "b", "a", "  "])).toEqual(["a", "b"]);
  });

  it("enforces season status, non-null timestamps, season bounds, and 72h upload windows", () => {
    const season = {
      id: VALID_UUID,
      status: "active",
      starts_at: "2026-11-01T00:00:00.000Z",
      ends_at: "2026-11-30T23:59:59.000Z",
    };

    expect(
      validateApprovalWindow({
        season: { ...season, status: "draft" },
        startedAtMs: Date.parse("2026-11-10T06:00:00.000Z"),
        endedAtMs: Date.parse("2026-11-10T06:30:00.000Z"),
        runCreatedAt: "2026-11-10T07:00:00.000Z",
      }),
    ).toEqual({ ok: false, code: "no_active_season" });

    expect(
      validateApprovalWindow({
        season,
        startedAtMs: null,
        endedAtMs: Date.parse("2026-11-10T06:30:00.000Z"),
        runCreatedAt: "2026-11-10T07:00:00.000Z",
      }),
    ).toEqual({ ok: false, code: "missing_timestamps" });

    // Before season start -> out_of_window
    expect(
      validateApprovalWindow({
        season,
        startedAtMs: Date.parse("2026-10-31T23:59:00.000Z"),
        endedAtMs: Date.parse("2026-11-01T00:20:00.000Z"),
        runCreatedAt: "2026-11-01T00:25:00.000Z",
      }),
    ).toEqual({ ok: false, code: "out_of_window" });

    // Created more than 72h after endedAt -> out_of_window
    const endedAtMs = Date.parse("2026-11-10T06:30:00.000Z");
    expect(
      validateApprovalWindow({
        season,
        startedAtMs: Date.parse("2026-11-10T06:00:00.000Z"),
        endedAtMs,
        runCreatedAt: new Date(endedAtMs + UPLOAD_WINDOW_MS + 1000).toISOString(),
      }),
    ).toEqual({ ok: false, code: "out_of_window" });

    // Created within 72h of endedAt and season.ends_at -> ok
    expect(
      validateApprovalWindow({
        season,
        startedAtMs: Date.parse("2026-11-10T06:00:00.000Z"),
        endedAtMs,
        runCreatedAt: new Date(endedAtMs + 60 * 60 * 1000).toISOString(),
      }),
    ).toEqual({ ok: true });
  });

  it("normalizes sport, storage paths, and downsamples long coordinate arrays", () => {
    expect(normalizeRunSport("running", "cycling")).toBe("running");
    expect(normalizeRunSport("trail", "cycling")).toBe("cycling");
    expect(normalizeRunSport("unknown", "unknown")).toBeNull();
    expect(parseStorageObjectPath("runs-raw/u1/run1.gpx")).toBe("u1/run1.gpx");

    const coords: [number, number][] = Array.from({ length: 500 }, (_, i) => [
      55.2 + i * 0.0001,
      25.15 + i * 0.0001,
    ]);
    const sampled = subsampleCoordinates(coords, 100);
    expect(sampled).toHaveLength(100);
    expect(sampled[0]).toEqual(coords[0]);
    expect(sampled[sampled.length - 1]).toEqual(coords[coords.length - 1]);
  });
});
