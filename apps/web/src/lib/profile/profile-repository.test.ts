import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { HybridProfileRepository } from "./profile-repository";

interface RecordedQuery {
  table: string;
  selectColumns: string | undefined;
  selectOptions: Record<string, unknown> | undefined;
  eqFilters: Array<[string, unknown]>;
  inFilters: Array<[string, unknown[]]>;
  lteFilters: Array<[string, unknown]>;
  orders: Array<{ column: string; ascending: boolean }>;
  limitValue: number | null;
  rangeValue: [number, number] | null;
  terminal: "maybeSingle" | "await";
}

interface MockQueryResult {
  data?: unknown;
  count?: number | null;
  error?: { message: string } | null;
  throwError?: Error;
}

type TableHandler = (query: RecordedQuery) => MockQueryResult;

function createMockSupabase(handlers: Record<string, TableHandler>) {
  const recorded: RecordedQuery[] = [];

  const client = {
    from(table: string) {
      const state: RecordedQuery = {
        table,
        selectColumns: undefined,
        selectOptions: undefined,
        eqFilters: [],
        inFilters: [],
        lteFilters: [],
        orders: [],
        limitValue: null,
        rangeValue: null,
        terminal: "await",
      };

      const execute = (): MockQueryResult => {
        recorded.push({
          ...state,
          eqFilters: [...state.eqFilters],
          inFilters: state.inFilters.map(([k, v]) => [k, [...v]]),
          lteFilters: [...state.lteFilters],
          orders: [...state.orders],
        });
        const handler = handlers[table];
        if (!handler) {
          return { data: [], count: 0, error: null };
        }
        const res = handler(state);
        if (res.throwError) {
          throw res.throwError;
        }
        return {
          data: res.data ?? null,
          count: res.count ?? null,
          error: res.error ?? null,
        };
      };

      const builder = {
        select(columns: string, options?: Record<string, unknown>) {
          state.selectColumns = columns;
          state.selectOptions = options;
          return builder;
        },
        eq(column: string, value: unknown) {
          state.eqFilters.push([column, value]);
          return builder;
        },
        in(column: string, values: unknown[]) {
          state.inFilters.push([column, values]);
          return builder;
        },
        lte(column: string, value: unknown) {
          state.lteFilters.push([column, value]);
          return builder;
        },
        order(column: string, opts?: { ascending?: boolean }) {
          state.orders.push({ column, ascending: opts?.ascending ?? true });
          return builder;
        },
        limit(n: number) {
          state.limitValue = n;
          return builder;
        },
        range(from: number, to: number) {
          state.rangeValue = [from, to];
          return builder;
        },
        maybeSingle() {
          state.terminal = "maybeSingle";
          return Promise.resolve(execute());
        },
        then<TResult1 = MockQueryResult, TResult2 = never>(
          onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve()
            .then(() => execute())
            .then(onfulfilled, onrejected);
        },
      };

      return builder;
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    recorded,
  };
}

const FIXED_NOW_MS = Date.parse("2026-11-12T10:00:00.000Z");

describe("HybridProfileRepository", () => {
  it("returns sample data when Supabase is not configured", async () => {
    const repo = new HybridProfileRepository({
      isSupabaseConfigured: () => false,
      getSupabase: () => null,
      now: () => FIXED_NOW_MS,
    });

    const res = await repo.getProfileData(null);

    expect(res.status).toBe("sample");
    expect(res.isSampleData).toBe(true);
    expect(res.error).toBeNull();
    if (res.status === "sample") {
      expect(res.runner.alias).toBeTruthy();
      expect(res.leagueAssignment).not.toBeNull();
      expect(res.ownedCellsCount).toBeGreaterThan(0);
      expect(res.runs.length).toBeGreaterThan(0);
      expect(res.stealNotices.length).toBeGreaterThan(0);
      expect(res.stealNotices.every((n) => n.type === "steal")).toBe(true);
    }
  });

  it("returns unauthenticated without touching Supabase when configured and currentUserId is null", async () => {
    const { client, recorded } = createMockSupabase({});
    const repo = new HybridProfileRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => client,
      now: () => FIXED_NOW_MS,
    });

    const res = await repo.getProfileData(null);

    expect(res).toEqual({
      status: "unauthenticated",
      isSampleData: false,
      error: null,
      runner: null,
      season: null,
      leagueAssignment: null,
      ownedCellsCount: 0,
      runs: [],
      hasMoreRuns: false,
      stealNotices: [],
    });
    expect(recorded).toHaveLength(0);
  });

  it("loads real profile data strictly adhering to schema, RLS columns, and filters", async () => {
    const userId = "user-runner-1";
    const zoneId = "zone-jumeirah";
    const seasonId = "season-2026-11";
    const leagueId = "league-advanced";

    const { client, recorded } = createMockSupabase({
      profiles: (q) => {
        if (q.inFilters.length > 0) {
          return {
            data: [
              { id: "rival-1", alias: "maya.dx" },
              { id: "rival-2", alias: null },
            ],
          };
        }
        return {
          data: {
            id: userId,
            alias: "omar.kite",
            created_at: "2026-10-20T08:00:00Z",
          },
        };
      },
      zones: () => ({
        data: {
          id: zoneId,
          slug: "jumeirah-kite",
          timezone: "Asia/Dubai",
        },
      }),
      seasons: () => ({
        data: {
          id: seasonId,
          name: "Temporada Noviembre 2026",
        },
      }),
      user_leagues: () => ({
        data: {
          league_id: leagueId,
          ref_pace_s: 312,
          valid_from: "2026-11-01T00:00:00Z",
          leagues: { code: "advanced" },
        },
      }),
      cell_ownership: () => ({
        data: null,
        count: 14,
      }),
      runs: () => ({
        data: [
          {
            id: "run-1",
            created_at: "2026-11-12T07:00:00Z",
            started_at: "2026-11-12T06:20:00Z",
            distance_in_zone_m: 6420,
            format: "fit",
            status: "accepted",
            reject_code: null,
          },
          {
            id: "run-2",
            created_at: "2026-11-11T07:00:00Z",
            started_at: null,
            distance_in_zone_m: null,
            format: "gpx",
            status: "rejected",
            reject_code: "BIKE_PATTERN",
          },
          {
            id: "run-3",
            created_at: "2026-11-10T07:00:00Z",
            started_at: "2026-11-10T06:30:00Z",
            distance_in_zone_m: 1200,
            format: "gpx",
            status: "voided",
            reject_code: "DUPLICATE",
          },
        ],
      }),
      ownership_events: () => ({
        data: [
          {
            id: "ev-1",
            type: "steal",
            zone_id: zoneId,
            league_id: leagueId,
            season_id: seasonId,
            actor_id: "rival-1",
            created_at: "2026-11-12T08:15:00Z",
            leagues: { code: "advanced" },
          },
          {
            id: "ev-2",
            type: "steal",
            zone_id: zoneId,
            league_id: leagueId,
            season_id: seasonId,
            actor_id: "rival-2",
            created_at: "2026-11-11T19:00:00Z",
            leagues: { code: "advanced" },
          },
          {
            id: "ev-3",
            type: "steal",
            zone_id: zoneId,
            league_id: leagueId,
            season_id: seasonId,
            actor_id: "rival-1",
            created_at: "2026-11-11T10:00:00Z",
            leagues: { code: "advanced" },
          },
        ],
      }),
    });

    const repo = new HybridProfileRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => client,
      now: () => FIXED_NOW_MS,
    });

    const res = await repo.getProfileData(userId, 2);

    expect(res.status).toBe("ready");
    expect(res.isSampleData).toBe(false);
    expect(res.error).toBeNull();
    if (res.status !== "ready") {
      throw new Error("Expected ready result");
    }

    expect(res.runner).toEqual({
      id: userId,
      alias: "omar.kite",
      createdAt: "2026-10-20T08:00:00Z",
    });
    expect(res.season).toEqual({
      id: seasonId,
      name: "Temporada Noviembre 2026",
    });
    expect(res.leagueAssignment).toEqual({
      leagueId,
      code: "advanced",
      refPaceS: 312,
      validFrom: "2026-11-01T00:00:00Z",
    });
    expect(res.ownedCellsCount).toBe(14);

    // Pagination fetched pageSize + 1 = 3 rows, so hasMoreRuns is true and slices to 2
    expect(res.hasMoreRuns).toBe(true);
    expect(res.runs).toHaveLength(2);
    expect(res.runs[1]?.distanceInZoneM).toBeNull();
    expect(res.runs[1]?.startedAt).toBeNull();
    expect(res.runs[1]?.rejectCode).toBe("BIKE_PATTERN");

    expect(res.stealNotices).toHaveLength(3);
    expect(res.stealNotices[0]?.actorAlias).toBe("maya.dx");
    expect(res.stealNotices[1]?.actorAlias).toBeNull();

    // Assert strict query compliance
    const ownProfileQuery = recorded.find(
      (q) => q.table === "profiles" && q.eqFilters.some(([col]) => col === "id"),
    );
    expect(ownProfileQuery?.selectColumns).toBe("id, alias, created_at");
    expect(ownProfileQuery?.selectColumns).not.toContain("is_admin");
    expect(ownProfileQuery?.selectColumns).not.toContain("*");

    const zoneQuery = recorded.find((q) => q.table === "zones");
    expect(zoneQuery?.eqFilters).toContainEqual(["slug", "jumeirah-kite"]);
    expect(zoneQuery?.eqFilters.some(([col]) => col === "status")).toBe(false);

    const userLeagueQuery = recorded.find((q) => q.table === "user_leagues");
    expect(userLeagueQuery?.eqFilters).toContainEqual(["user_id", userId]);
    expect(userLeagueQuery?.eqFilters).toContainEqual(["season_id", seasonId]);
    expect(userLeagueQuery?.lteFilters).toContainEqual([
      "valid_from",
      new Date(FIXED_NOW_MS).toISOString(),
    ]);

    const ownershipQuery = recorded.find((q) => q.table === "cell_ownership");
    expect(ownershipQuery?.selectColumns).toBe("h3");
    expect(ownershipQuery?.selectOptions).toEqual({ count: "exact", head: true });
    expect(ownershipQuery?.eqFilters).toContainEqual(["zone_id", zoneId]);
    expect(ownershipQuery?.eqFilters).toContainEqual(["season_id", seasonId]);
    expect(ownershipQuery?.eqFilters).toContainEqual(["league_id", leagueId]);
    expect(ownershipQuery?.eqFilters).toContainEqual(["owner_id", userId]);

    const stealsQuery = recorded.find((q) => q.table === "ownership_events");
    expect(stealsQuery?.eqFilters).toContainEqual(["type", "steal"]);
    expect(stealsQuery?.eqFilters).toContainEqual(["prev_owner_id", userId]);
    expect(stealsQuery?.eqFilters).toContainEqual(["zone_id", zoneId]);

    const actorProfileQuery = recorded.find(
      (q) => q.table === "profiles" && q.inFilters.length > 0,
    );
    expect(actorProfileQuery?.selectColumns).toBe("id, alias");
    expect(actorProfileQuery?.inFilters).toEqual([["id", ["rival-1", "rival-2"]]]);
  });

  it("handles null profile row and alias: null without failing, and skips actor lookup when steals are empty", async () => {
    const userId = "user-new";
    const { client, recorded } = createMockSupabase({
      profiles: () => ({ data: null }),
      zones: () => ({
        data: { id: "zone-1", slug: "jumeirah-kite", timezone: "Asia/Dubai" },
      }),
      seasons: () => ({ data: null }),
      runs: () => ({ data: [] }),
      ownership_events: () => ({ data: [] }),
    });

    const repo = new HybridProfileRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => client,
      now: () => FIXED_NOW_MS,
    });

    const res = await repo.getProfileData(userId);
    expect(res.status).toBe("ready");
    if (res.status !== "ready") {
      throw new Error("Expected ready result");
    }

    expect(res.runner).toEqual({ id: userId, alias: null, createdAt: null });
    expect(res.season).toBeNull();
    expect(res.leagueAssignment).toBeNull();
    expect(res.ownedCellsCount).toBe(0);
    expect(res.runs).toEqual([]);
    expect(res.stealNotices).toEqual([]);

    // Ensure user_leagues, cell_ownership, and actor profiles were skipped
    expect(recorded.some((q) => q.table === "user_leagues")).toBe(false);
    expect(recorded.some((q) => q.table === "cell_ownership")).toBe(false);
    const profileQueries = recorded.filter((q) => q.table === "profiles");
    expect(profileQueries).toHaveLength(1);
  });

  it("ignores future user_leagues assignments even if a backend returns one", async () => {
    const userId = "user-future-league";
    const { client, recorded } = createMockSupabase({
      profiles: () => ({ data: { id: userId, alias: null, created_at: null } }),
      zones: () => ({
        data: { id: "zone-1", slug: "jumeirah-kite", timezone: "Asia/Dubai" },
      }),
      seasons: () => ({ data: { id: "season-1", name: "Season 1" } }),
      user_leagues: () => ({
        data: {
          league_id: "league-elite",
          ref_pace_s: 230,
          valid_from: "2026-12-01T00:00:00Z",
          leagues: { code: "elite" },
        },
      }),
      runs: () => ({ data: [] }),
      ownership_events: () => ({ data: [] }),
    });

    const repo = new HybridProfileRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => client,
      now: () => FIXED_NOW_MS,
    });

    const res = await repo.getProfileData(userId);
    expect(res.status).toBe("ready");
    if (res.status !== "ready") {
      throw new Error("Expected ready result");
    }

    expect(res.leagueAssignment).toBeNull();
    expect(res.ownedCellsCount).toBe(0);
    expect(recorded.some((q) => q.table === "cell_ownership")).toBe(false);
  });

  it("paginates additional runs via loadMoreRuns and supports all 6 run statuses", async () => {
    const userId = "user-runner-pages";
    const { client, recorded } = createMockSupabase({
      runs: () => ({
        data: [
          {
            id: "r-4",
            created_at: "2026-11-09T07:00:00Z",
            started_at: null,
            distance_in_zone_m: 3100,
            format: "fit",
            status: "pending",
            reject_code: null,
          },
          {
            id: "r-5",
            created_at: "2026-11-08T07:00:00Z",
            started_at: "2026-11-08T06:00:00Z",
            distance_in_zone_m: 4100,
            format: "gpx",
            status: "processing",
            reject_code: null,
          },
          {
            id: "r-6",
            created_at: "2026-11-07T07:00:00Z",
            started_at: "2026-11-07T06:00:00Z",
            distance_in_zone_m: 5000,
            format: "gpx",
            status: "review",
            reject_code: "GPS_SPIKES",
          },
        ],
      }),
    });

    const repo = new HybridProfileRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => client,
      now: () => FIXED_NOW_MS,
    });

    const page = await repo.loadMoreRuns(userId, 20, 5);
    expect(page.error).toBeNull();
    expect(page.hasMore).toBe(false);
    expect(page.runs.map((r) => r.status)).toEqual(["pending", "processing", "review"]);
    expect(recorded[0]?.rangeValue).toEqual([20, 25]);
  });

  it("returns network_error with zero mock fallback when any query errors or throws", async () => {
    const { client } = createMockSupabase({
      profiles: () => ({ data: { id: "u1", alias: "runner", created_at: null } }),
      zones: () => ({ data: { id: "z1", slug: "jumeirah-kite", timezone: "Asia/Dubai" } }),
      seasons: () => ({ data: null }),
      runs: () => ({ error: { message: "permission denied or timeout" } }),
      ownership_events: () => ({ data: [] }),
    });

    const repo = new HybridProfileRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => client,
      now: () => FIXED_NOW_MS,
    });

    const res = await repo.getProfileData("u1");
    expect(res).toEqual({
      status: "error",
      isSampleData: false,
      error: "network_error",
      runner: null,
      season: null,
      leagueAssignment: null,
      ownedCellsCount: 0,
      runs: [],
      hasMoreRuns: false,
      stealNotices: [],
    });

    const { client: throwingClient } = createMockSupabase({
      profiles: () => ({ throwError: new Error("fetch failed") }),
    });
    const repoThrow = new HybridProfileRepository({
      isSupabaseConfigured: () => true,
      getSupabase: () => throwingClient,
      now: () => FIXED_NOW_MS,
    });

    const resThrow = await repoThrow.getProfileData("u1");
    expect(resThrow).toEqual({
      status: "error",
      isSampleData: false,
      error: "network_error",
      runner: null,
      season: null,
      leagueAssignment: null,
      ownedCellsCount: 0,
      runs: [],
      hasMoreRuns: false,
      stealNotices: [],
    });
  });
});
