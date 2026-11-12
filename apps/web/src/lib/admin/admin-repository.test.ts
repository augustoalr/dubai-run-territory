import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { es } from "@/i18n/dictionaries";
import { HybridAdminRepository } from "./admin-repository";

function createFakeSupabase(token: string | null): SupabaseClient {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: token ? { access_token: token } : null,
        },
        error: null,
      })),
    },
  } as unknown as SupabaseClient;
}

describe("HybridAdminRepository", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns coherent sample data with isSampleData=true when Supabase is not configured", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const repo = new HybridAdminRepository({
      isSupabaseConfigured: () => false,
      getSupabase: () => null,
      fetcher,
    });

    const res = await repo.getQueue();
    expect(res.status).toBe("sample");
    expect(res.isSampleData).toBe(true);
    if (res.status === "sample") {
      expect(res.runsReview.length).toBeGreaterThan(0);
      expect(res.reports.length).toBeGreaterThan(0);
      expect(res.auditLogs.length).toBeGreaterThan(0);
    }
    expect(fetcher).not.toHaveBeenCalled();

    const act = await repo.submitAction({
      action: "approve_run",
      targetId: "00000000-0000-0000-0000-000000000001",
      reason: "GPX review checked cleanly",
    });
    expect(act).toEqual({
      ok: true,
      action: "approve_run",
      targetId: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("returns unauthenticated when Supabase is configured and there is no session token", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const repo = new HybridAdminRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => createFakeSupabase(null),
      fetcher,
    });

    const res = await repo.getQueue();
    expect(res.status).toBe("unauthenticated");
    expect(res.isSampleData).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps 401 and 403 responses without falling back to sample data", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-123");

    const fetcher401 = vi.fn<typeof fetch>(async () => new Response(null, { status: 401 }));
    const repo401 = new HybridAdminRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => createFakeSupabase("jwt-token"),
      fetcher: fetcher401,
    });
    const res401 = await repo401.getQueue();
    expect(res401.status).toBe("unauthenticated");
    expect(res401.isSampleData).toBe(false);

    const fetcher403 = vi.fn<typeof fetch>(async () => new Response(null, { status: 403 }));
    const repo403 = new HybridAdminRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => createFakeSupabase("jwt-token"),
      fetcher: fetcher403,
    });
    const res403 = await repo403.getQueue();
    expect(res403.status).toBe("forbidden");
    expect(res403.isSampleData).toBe(false);
  });

  it("maps server errors and thrown network errors to status error", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-123");

    const fetcher500 = vi.fn<typeof fetch>(async () => new Response("boom", { status: 500 }));
    const repo500 = new HybridAdminRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => createFakeSupabase("jwt-token"),
      fetcher: fetcher500,
    });
    const res500 = await repo500.getQueue();
    expect(res500).toEqual({
      status: "error",
      isSampleData: false,
      error: "network_error",
      runsReview: [],
      reports: [],
      auditLogs: [],
    });

    const fetcherThrow = vi.fn<typeof fetch>(async () => {
      throw new Error("offline");
    });
    const repoThrow = new HybridAdminRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => createFakeSupabase("jwt-token"),
      fetcher: fetcherThrow,
    });
    const resThrow = await repoThrow.getQueue();
    expect(resThrow.status).toBe("error");
    expect(resThrow.isSampleData).toBe(false);
  });

  it("sends apikey + Bearer headers on GET and POST and normalizes payloads", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-123");

    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("apikey")).toBe("anon-key-123");
      expect(headers.get("Authorization")).toBe("Bearer admin-jwt");

      if (init?.method === "POST") {
        expect(input).toBe("https://proj.supabase.co/functions/v1/admin-review");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      return new Response(
        JSON.stringify({
          runsReview: [
            {
              id: "run-1",
              userId: "user-1",
              runnerAlias: "RunnerOne",
              zoneId: "zone-1",
              seasonId: null,
              format: "gpx",
              source: "manual",
              sport: "running",
              startedAt: "2026-11-10T06:00:00.000Z",
              endedAt: "2026-11-10T06:20:00.000Z",
              distanceInZoneM: 3200,
              status: "review",
              rejectCode: "ANTI_CHEAT_REVIEW",
              flags: ["SPIKE"],
              createdAt: "2026-11-10T06:25:00.000Z",
              coordinates: [
                [55.2, 25.15],
                [55.202, 25.152],
              ],
              trackUnavailable: false,
            },
          ],
          reports: [],
          auditLogs: [],
        }),
        { status: 200 },
      );
    });

    const repo = new HybridAdminRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => createFakeSupabase("admin-jwt"),
      fetcher,
    });

    const loaded = await repo.getQueue();
    expect(loaded.status).toBe("ready");
    if (loaded.status === "ready") {
      expect(loaded.runsReview).toHaveLength(1);
      expect(loaded.runsReview[0]?.coordinates).toHaveLength(2);
    }

    const badReason = await repo.submitAction({
      action: "approve_run",
      targetId: "run-1",
      reason: "no",
    });
    expect(badReason).toEqual({ ok: false, status: 400, code: "invalid_reason" });

    const okAction = await repo.submitAction({
      action: "approve_run",
      targetId: "run-1",
      reason: "Valid interval training GPX",
    });
    expect(okAction).toEqual({ ok: true, action: "approve_run", targetId: "run-1" });
  });

  it("keeps admin dictionary labels free of raw H3 or s/km jargon", () => {
    const adminText = JSON.stringify({
      adminPageTitle: es.adminPageTitle,
      adminSubtitle: es.adminSubtitle,
      adminFlagLabels: es.adminFlagLabels,
      adminErrors: es.adminErrors,
    });
    expect(adminText).not.toMatch(/\bH3\b/);
    expect(adminText).not.toMatch(/s\/km/i);
  });
});
