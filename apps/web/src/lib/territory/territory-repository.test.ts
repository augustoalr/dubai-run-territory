import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { HybridTerritoryRepository, territoryRepository } from "./territory-repository";

type FilterRecord =
  | { op: "eq"; column: string; value: unknown }
  | { op: "in"; column: string; values: unknown[] }
  | { op: "lte"; column: string; value: unknown };

type QueryResponse = {
  data: unknown;
  error: unknown;
};

type CapturedQuery = {
  table: string;
  selectCols: string;
  filters: FilterRecord[];
  orders: Array<{ column: string; ascending: boolean }>;
  limitValue?: number;
  rangeArgs?: [number, number];
};

type QueryHandler = (query: CapturedQuery) => QueryResponse;

function createMockSupabase(handler: QueryHandler): {
  client: SupabaseClient;
  queries: CapturedQuery[];
} {
  const queries: CapturedQuery[] = [];

  const from = (table: string) => {
    const state: CapturedQuery = {
      table,
      selectCols: "",
      filters: [],
      orders: [],
    };

    const execute = async (): Promise<QueryResponse> => {
      queries.push({
        table: state.table,
        selectCols: state.selectCols,
        filters: [...state.filters],
        orders: [...state.orders],
        limitValue: state.limitValue,
        rangeArgs: state.rangeArgs,
      });
      return handler(state);
    };

    const builder = {
      select(cols: string) {
        state.selectCols = cols;
        return builder;
      },
      eq(column: string, value: unknown) {
        state.filters.push({ op: "eq", column, value });
        return builder;
      },
      in(column: string, values: unknown[]) {
        state.filters.push({ op: "in", column, values });
        return builder;
      },
      lte(column: string, value: unknown) {
        state.filters.push({ op: "lte", column, value });
        return builder;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        state.orders.push({ column, ascending: opts?.ascending ?? true });
        return builder;
      },
      limit(value: number) {
        state.limitValue = value;
        return builder;
      },
      range(fromIdx: number, toIdx: number) {
        state.rangeArgs = [fromIdx, toIdx];
        return builder;
      },
      maybeSingle() {
        return execute();
      },
      then<TResult1 = QueryResponse, TResult2 = never>(
        onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return execute().then(onfulfilled, onrejected);
      },
    };

    return builder;
  };

  return {
    client: { from } as unknown as SupabaseClient,
    queries,
  };
}

const ZONE_ID = "11111111-1111-1111-1111-111111111111";
const SEASON_ID = "22222222-2222-2222-2222-222222222222";
const LEAGUE_STARTER_ID = "33333333-3333-3333-3333-333333333333";
const USER_ID = "aaaa1111-1111-1111-1111-111111111111";
const RIVAL_ID = "bbbb2222-2222-2222-2222-222222222222";

const H3_A = "8a43a136a49ffff";
const H3_B = "8a43a136a4b7fff";
const H3_C = "8a43a136a4affff";
const H3_D = "8a43a136a48ffff";

describe("HybridTerritoryRepository", () => {
  it("returns sample data with isSampleData=true when Supabase is not configured", async () => {
    const data = await territoryRepository.getTerritoryData("starter", null);
    const userLeague = await territoryRepository.getUserLeague(USER_ID);

    expect(userLeague).toBeNull();
    expect(data.league).toBe("starter");
    expect(data.isSampleData).toBe(true);
    expect(data.error).toBeNull();
    expect(data.cells.length).toBeGreaterThan(0);
    expect(data.stats.total).toBe(data.cells.length);
  });

  it("queries draft zone without status filter and returns all free cells when no active season exists", async () => {
    const { client, queries } = createMockSupabase((q) => {
      if (q.table === "zones") {
        return {
          data: { id: ZONE_ID, slug: "jumeirah-kite", timezone: "Asia/Dubai" },
          error: null,
        };
      }
      if (q.table === "zone_cells") {
        return { data: [{ h3: H3_A }, { h3: H3_B }, { h3: H3_C }], error: null };
      }
      if (q.table === "seasons") {
        return { data: null, error: null };
      }
      if (q.table === "leagues") {
        return { data: [{ id: LEAGUE_STARTER_ID, code: "starter", zone_id: null }], error: null };
      }
      throw new Error(`Unexpected query to ${q.table}`);
    });

    const repo = new HybridTerritoryRepository({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
      now: () => Date.parse("2026-11-10T10:00:00Z"),
    });

    const result = await repo.getTerritoryData("starter", USER_ID);

    expect(result.isSampleData).toBe(false);
    expect(result.hasActiveSeason).toBe(false);
    expect(result.seasonName).toBeNull();
    expect(result.error).toBeNull();
    expect(result.cells).toHaveLength(3);
    expect(result.cells.every((cell) => cell.status === "free" && cell.owner === null)).toBe(true);
    expect(result.stats).toEqual({ mine: 0, threatened: 0, rival: 0, free: 3, total: 3 });

    const zoneQuery = queries.find((q) => q.table === "zones");
    expect(zoneQuery?.filters).toEqual([{ op: "eq", column: "slug", value: "jumeirah-kite" }]);
    expect(queries.some((q) => q.table === "runs")).toBe(false);
  });

  it("marks all owned cells as rival when unauthenticated and skips cell_efforts", async () => {
    const { client, queries } = createMockSupabase((q) => {
      switch (q.table) {
        case "zones":
          return {
            data: { id: ZONE_ID, slug: "jumeirah-kite", timezone: "Asia/Dubai" },
            error: null,
          };
        case "zone_cells":
          return { data: [{ h3: H3_A }, { h3: H3_B }], error: null };
        case "seasons":
          return { data: { id: SEASON_ID, name: "Temporada 1", status: "active" }, error: null };
        case "leagues":
          return { data: [{ id: LEAGUE_STARTER_ID, code: "starter", zone_id: null }], error: null };
        case "cell_ownership":
          return {
            data: [
              {
                h3: H3_A,
                owner_id: USER_ID,
                pace_s: 360,
                achieved_at: "2026-11-08T06:00:00Z",
                since: "2026-11-08T06:00:00Z",
              },
            ],
            error: null,
          };
        case "profiles":
          return { data: [{ id: USER_ID, alias: "runner.one" }], error: null };
        default:
          throw new Error(`Unexpected query to ${q.table}`);
      }
    });

    const repo = new HybridTerritoryRepository({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
      now: () => Date.parse("2026-11-10T10:00:00Z"),
    });

    const result = await repo.getTerritoryData("starter", null);

    expect(result.isSampleData).toBe(false);
    expect(result.hasActiveSeason).toBe(true);
    expect(result.seasonName).toBe("Temporada 1");
    expect(result.error).toBeNull();
    expect(queries.some((q) => q.table === "cell_efforts")).toBe(false);
    expect(queries.some((q) => q.table === "runs")).toBe(false);

    const profileQuery = queries.find((q) => q.table === "profiles");
    expect(profileQuery?.filters).toEqual([{ op: "in", column: "id", values: [USER_ID] }]);

    const cellA = result.cells.find((c) => c.id === H3_A);
    const cellB = result.cells.find((c) => c.id === H3_B);
    expect(cellA?.status).toBe("rival");
    expect(cellA?.owner?.alias).toBe("runner.one");
    expect(cellA?.owner?.isCurrentUser).toBe(false);
    expect(cellA?.paceFormatted).toBe("6:00 /km");
    expect(cellA?.userBestPaceSeconds).toBeNull();
    expect(cellA?.gapSeconds).toBeNull();
    expect(cellB?.status).toBe("free");
  });

  it("computes threatened solely from MAX(crossed_at) in own cell_efforts and MIN(pace_s) gap vs rivals", async () => {
    const nowMs = Date.parse("2026-11-20T12:00:00Z"); // Dubai 16:00 on Nov 20

    const { client, queries } = createMockSupabase((q) => {
      switch (q.table) {
        case "zones":
          return {
            data: { id: ZONE_ID, slug: "jumeirah-kite", timezone: "Asia/Dubai" },
            error: null,
          };
        case "zone_cells":
          return {
            data: [{ h3: H3_A }, { h3: H3_B }, { h3: H3_C }, { h3: H3_D }],
            error: null,
          };
        case "seasons":
          return { data: { id: SEASON_ID, name: "Temporada 1", status: "active" }, error: null };
        case "leagues":
          return { data: [{ id: LEAGUE_STARTER_ID, code: "starter", zone_id: null }], error: null };
        case "cell_ownership":
          return {
            data: [
              // H3_A: owned by USER, conquered 12 days ago, but re-run slower 3 days ago -> must stay "mine"
              {
                h3: H3_A,
                owner_id: USER_ID,
                pace_s: 365,
                achieved_at: "2026-11-08T06:00:00Z",
                since: "2026-11-08T06:00:00Z",
              },
              // H3_B: owned by USER, latest crossed_at 9 days ago -> must be "threatened" with threat=null
              {
                h3: H3_B,
                owner_id: USER_ID,
                pace_s: 370,
                achieved_at: "2026-11-11T06:00:00Z",
                since: "2026-11-11T06:00:00Z",
              },
              // H3_C: owned by USER, missing own cell_efforts -> must stay "mine" (never invent threat)
              {
                h3: H3_C,
                owner_id: USER_ID,
                pace_s: 380,
                achieved_at: "2026-11-01T06:00:00Z",
                since: "2026-11-01T06:00:00Z",
              },
              // H3_D: owned by RIVAL at 355s, USER best effort is 362s -> gapSeconds = 8 (362 - 355 + 1)
              {
                h3: H3_D,
                owner_id: RIVAL_ID,
                pace_s: 355,
                achieved_at: "2026-11-18T06:00:00Z",
                since: "2026-11-18T06:00:00Z",
              },
            ],
            error: null,
          };
        case "cell_efforts":
          return {
            data: [
              { h3: H3_A, crossed_at: "2026-11-08T06:00:00Z", pace_s: 365 },
              // Slower re-run 3 days ago resets defense window even though pace did not improve
              { h3: H3_A, crossed_at: "2026-11-17T06:00:00Z", pace_s: 390 },
              { h3: H3_B, crossed_at: "2026-11-11T06:00:00Z", pace_s: 370 },
              { h3: H3_D, crossed_at: "2026-11-15T06:00:00Z", pace_s: 375 },
              { h3: H3_D, crossed_at: "2026-11-16T06:00:00Z", pace_s: 362 },
            ],
            error: null,
          };
        case "profiles":
          return {
            data: [
              { id: USER_ID, alias: "maya.dxbrun" },
              { id: RIVAL_ID, alias: "omar.fast" },
            ],
            error: null,
          };
        default:
          throw new Error(`Unexpected query to ${q.table}`);
      }
    });

    const repo = new HybridTerritoryRepository({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
      now: () => nowMs,
    });

    const result = await repo.getTerritoryData("starter", USER_ID);

    expect(result.error).toBeNull();
    expect(result.isSampleData).toBe(false);
    expect(result.stats).toEqual({ mine: 2, threatened: 1, rival: 1, free: 0, total: 4 });

    const effortsQuery = queries.find((q) => q.table === "cell_efforts");
    expect(effortsQuery?.filters).toContainEqual({ op: "eq", column: "user_id", value: USER_ID });
    expect(effortsQuery?.filters).toContainEqual({ op: "eq", column: "zone_id", value: ZONE_ID });
    expect(effortsQuery?.filters).toContainEqual({
      op: "eq",
      column: "season_id",
      value: SEASON_ID,
    });
    expect(effortsQuery?.filters).toContainEqual({
      op: "eq",
      column: "league_id",
      value: LEAGUE_STARTER_ID,
    });
    expect(queries.some((q) => q.table === "runs")).toBe(false);

    const cellA = result.cells.find((c) => c.id === H3_A);
    expect(cellA?.status).toBe("mine");
    expect(cellA?.userBestPaceSeconds).toBe(365);

    const cellB = result.cells.find((c) => c.id === H3_B);
    expect(cellB?.status).toBe("threatened");
    expect(cellB?.threat).toBeNull();

    const cellC = result.cells.find((c) => c.id === H3_C);
    expect(cellC?.status).toBe("mine");

    const cellD = result.cells.find((c) => c.id === H3_D);
    expect(cellD?.status).toBe("rival");
    expect(cellD?.owner?.alias).toBe("omar.fast");
    expect(cellD?.paceFormatted).toBe("5:55 /km");
    expect(cellD?.userBestPaceFormatted).toBe("6:02 /km");
    expect(cellD?.userBestPaceSeconds).toBe(362);
    expect(cellD?.gapSeconds).toBe(8);
  });

  it("propagates network_error without falling back to sample data when a query fails", async () => {
    const { client } = createMockSupabase((q) => {
      if (q.table === "zones") {
        return {
          data: { id: ZONE_ID, slug: "jumeirah-kite", timezone: "Asia/Dubai" },
          error: null,
        };
      }
      if (q.table === "zone_cells") {
        return { data: null, error: { message: "connection timeout" } };
      }
      return { data: null, error: null };
    });

    const repo = new HybridTerritoryRepository({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
    });

    const result = await repo.getTerritoryData("starter", USER_ID);

    expect(result.error).toBe("network_error");
    expect(result.isSampleData).toBe(false);
    expect(result.cells).toEqual([]);
  });

  it("paginates cell_efforts when exceeding 1000 rows", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({
      h3: H3_A,
      crossed_at: "2026-11-05T06:00:00Z",
      pace_s: 360 + (i % 10),
    }));
    const secondPage = [
      {
        h3: H3_A,
        crossed_at: "2026-11-19T06:00:00Z",
        pace_s: 390,
      },
    ];

    const { client, queries } = createMockSupabase((q) => {
      switch (q.table) {
        case "zones":
          return {
            data: { id: ZONE_ID, slug: "jumeirah-kite", timezone: "Asia/Dubai" },
            error: null,
          };
        case "zone_cells":
          return { data: [{ h3: H3_A }], error: null };
        case "seasons":
          return { data: { id: SEASON_ID, name: "Temporada 1", status: "active" }, error: null };
        case "leagues":
          return { data: [{ id: LEAGUE_STARTER_ID, code: "starter", zone_id: null }], error: null };
        case "cell_ownership":
          return {
            data: [
              {
                h3: H3_A,
                owner_id: USER_ID,
                pace_s: 360,
                achieved_at: "2026-11-05T06:00:00Z",
                since: "2026-11-05T06:00:00Z",
              },
            ],
            error: null,
          };
        case "cell_efforts":
          return {
            data: q.rangeArgs?.[0] === 0 ? firstPage : secondPage,
            error: null,
          };
        case "profiles":
          return { data: [{ id: USER_ID, alias: "maya.dxbrun" }], error: null };
        default:
          throw new Error(`Unexpected query to ${q.table}`);
      }
    });

    const repo = new HybridTerritoryRepository({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
      now: () => Date.parse("2026-11-20T12:00:00Z"),
    });

    const result = await repo.getTerritoryData("starter", USER_ID);
    const effortRanges = queries.filter((q) => q.table === "cell_efforts").map((q) => q.rangeArgs);

    expect(effortRanges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(result.cells[0]?.status).toBe("mine");
  });

  it("resolves getUserLeague via draft zone, active season, and user_leagues with valid_from <= now", async () => {
    const nowMs = Date.parse("2026-11-12T10:00:00.000Z");
    const { client, queries } = createMockSupabase((q) => {
      if (q.table === "zones") {
        return { data: { id: ZONE_ID }, error: null };
      }
      if (q.table === "seasons") {
        return { data: { id: SEASON_ID }, error: null };
      }
      if (q.table === "user_leagues") {
        const userFilter = q.filters.find((f) => f.op === "eq" && f.column === "user_id");
        if (userFilter?.op === "eq" && userFilter.value === USER_ID) {
          return {
            data: {
              valid_from: "2026-11-10T08:00:00.000Z",
              leagues: { code: "intermediate" },
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }
      throw new Error(`Unexpected query to ${q.table}`);
    });

    const repo = new HybridTerritoryRepository({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
      now: () => nowMs,
    });

    expect(await repo.getUserLeague(USER_ID)).toBe("intermediate");
    expect(await repo.getUserLeague(RIVAL_ID)).toBeNull();

    const zoneQuery = queries.find((q) => q.table === "zones");
    expect(zoneQuery?.filters).toEqual([{ op: "eq", column: "slug", value: "jumeirah-kite" }]);

    const seasonQuery = queries.find((q) => q.table === "seasons");
    expect(seasonQuery?.filters).toEqual([
      { op: "eq", column: "zone_id", value: ZONE_ID },
      { op: "eq", column: "status", value: "active" },
    ]);

    const ulQuery = queries.find((q) => q.table === "user_leagues");
    expect(ulQuery?.selectCols).toBe("valid_from, leagues(code)");
    expect(ulQuery?.filters).toEqual([
      { op: "eq", column: "user_id", value: USER_ID },
      { op: "eq", column: "season_id", value: SEASON_ID },
      { op: "lte", column: "valid_from", value: "2026-11-12T10:00:00.000Z" },
    ]);
    expect(ulQuery?.orders).toEqual([{ column: "valid_from", ascending: false }]);
    expect(ulQuery?.limitValue).toBe(1);
  });

  it("discards future user_leagues rows and degrades to null without active season or on error", async () => {
    const nowMs = Date.parse("2026-11-12T10:00:00.000Z");

    const futureRowClient = createMockSupabase((q) => {
      if (q.table === "zones") return { data: { id: ZONE_ID }, error: null };
      if (q.table === "seasons") return { data: { id: SEASON_ID }, error: null };
      if (q.table === "user_leagues") {
        return {
          data: {
            valid_from: "2026-11-13T10:00:00.000Z",
            leagues: [{ code: "elite" }],
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }).client;

    const noSeasonClient = createMockSupabase((q) => {
      if (q.table === "zones") return { data: { id: ZONE_ID }, error: null };
      if (q.table === "seasons") return { data: null, error: null };
      throw new Error("user_leagues should not be queried without active season");
    }).client;

    const networkErrorClient = createMockSupabase(() => ({
      data: null,
      error: { message: "timeout" },
    })).client;

    expect(
      await new HybridTerritoryRepository({
        getSupabase: () => futureRowClient,
        isSupabaseConfigured: () => true,
        now: () => nowMs,
      }).getUserLeague(USER_ID),
    ).toBeNull();

    expect(
      await new HybridTerritoryRepository({
        getSupabase: () => noSeasonClient,
        isSupabaseConfigured: () => true,
        now: () => nowMs,
      }).getUserLeague(USER_ID),
    ).toBeNull();

    expect(
      await new HybridTerritoryRepository({
        getSupabase: () => networkErrorClient,
        isSupabaseConfigured: () => true,
        now: () => nowMs,
      }).getUserLeague(USER_ID),
    ).toBeNull();
  });
});
