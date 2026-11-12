import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  HybridRankingRepository,
  calculateDaysRemaining,
  getMockLeagueRanking,
  getMockSeason,
  rankingRepository,
} from "./index";

type FilterRecord =
  | { op: "eq"; column: string; value: unknown }
  | { op: "in"; column: string; values: unknown[] }
  | { op: "lte"; column: string; value: unknown };

type CapturedQuery = {
  table: string;
  selectCols: string;
  filters: FilterRecord[];
  orders: Array<{ column: string; ascending: boolean }>;
  limitValue?: number;
};

type QueryResponse = {
  data: unknown;
  error: unknown;
};

function createMockSupabase(handler: (q: CapturedQuery) => QueryResponse): {
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
const USER_ID = "aaaa1111-1111-1111-1111-111111111111";

describe("Ranking repository and mock data (apps/web)", () => {
  it("calculates days remaining accurately", () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const { daysRemaining, isFinished } = calculateDaysRemaining(futureDate);
    expect(daysRemaining).toBe(5);
    expect(isFinished).toBe(false);

    const pastDate = new Date(Date.now() - 1000).toISOString();
    const pastResult = calculateDaysRemaining(pastDate);
    expect(pastResult.daysRemaining).toBe(0);
    expect(pastResult.isFinished).toBe(true);
  });

  it("getMockSeason provides active season metadata", () => {
    const season = getMockSeason();
    expect(season.id).toBeDefined();
    expect(season.name).toBe("Temporada 1");
    expect(season.daysRemaining).toBeGreaterThan(0);
    expect(season.isFinished).toBe(false);
  });

  it("getMockLeagueRanking returns ordered runners with isSampleData=true for all leagues", () => {
    for (const league of ["starter", "intermediate", "advanced", "elite"] as const) {
      const data = getMockLeagueRanking(league);
      expect(data.league).toBe(league);
      expect(data.isSampleData).toBe(true);
      expect(data.error).toBeNull();
      expect(data.runners.length).toBeGreaterThanOrEqual(3);

      // Verify runners are ordered by rank
      for (let i = 0; i < data.runners.length - 1; i += 1) {
        expect(data.runners[i]!.rank).toBeLessThanOrEqual(data.runners[i + 1]!.rank);
        expect(data.runners[i]!.points).toBeGreaterThanOrEqual(data.runners[i + 1]!.points);
      }
    }
  });

  it("rankingRepository marks sample data when Supabase is not configured", async () => {
    const ranking = await rankingRepository.getLeagueRanking("starter");
    const userLeague = await rankingRepository.getUserLeague(USER_ID);
    expect(userLeague).toBeNull();
    expect(ranking.league).toBe("starter");
    expect(ranking.isSampleData).toBe(true);
    expect(ranking.error).toBeNull();
    expect(ranking.runners.length).toBeGreaterThan(0);
    expect(ranking.runners[0]!.rank).toBe(1);
    expect(ranking.runners[0]!.points).toBeGreaterThan(0);
  });

  it("getUserLeague queries draft zone, active season, and user_leagues with valid_from <= now", async () => {
    const nowMs = Date.parse("2026-11-12T10:00:00.000Z");
    const { client, queries } = createMockSupabase((q) => {
      if (q.table === "zones") {
        return { data: { id: ZONE_ID }, error: null };
      }
      if (q.table === "seasons") {
        return { data: { id: SEASON_ID }, error: null };
      }
      if (q.table === "user_leagues") {
        return {
          data: {
            valid_from: "2026-11-11T06:00:00.000Z",
            leagues: [{ code: "advanced" }],
          },
          error: null,
        };
      }
      throw new Error(`Unexpected query to ${q.table}`);
    });

    const repo = new HybridRankingRepository({
      getSupabase: () => client,
      isSupabaseConfigured: () => true,
      now: () => nowMs,
    });

    expect(await repo.getUserLeague(USER_ID)).toBe("advanced");

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

  it("getUserLeague discards future valid_from rows and returns null without active season or on error", async () => {
    const nowMs = Date.parse("2026-11-12T10:00:00.000Z");

    const futureClient = createMockSupabase((q) => {
      if (q.table === "zones") return { data: { id: ZONE_ID }, error: null };
      if (q.table === "seasons") return { data: { id: SEASON_ID }, error: null };
      if (q.table === "user_leagues") {
        return {
          data: {
            valid_from: "2026-11-14T10:00:00.000Z",
            leagues: { code: "elite" },
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

    const errorClient = createMockSupabase(() => {
      throw new Error("network failure");
    }).client;

    expect(
      await new HybridRankingRepository({
        getSupabase: () => futureClient,
        isSupabaseConfigured: () => true,
        now: () => nowMs,
      }).getUserLeague(USER_ID),
    ).toBeNull();

    expect(
      await new HybridRankingRepository({
        getSupabase: () => noSeasonClient,
        isSupabaseConfigured: () => true,
        now: () => nowMs,
      }).getUserLeague(USER_ID),
    ).toBeNull();

    expect(
      await new HybridRankingRepository({
        getSupabase: () => errorClient,
        isSupabaseConfigured: () => true,
        now: () => nowMs,
      }).getUserLeague(USER_ID),
    ).toBeNull();
  });

  it("getLeagueRanking uses injected deps consistently for empty season and network error", async () => {
    const noSeasonClient = createMockSupabase((q) => {
      if (q.table === "seasons") return { data: null, error: null };
      return { data: null, error: null };
    }).client;

    const emptyResult = await new HybridRankingRepository({
      getSupabase: () => noSeasonClient,
      isSupabaseConfigured: () => true,
    }).getLeagueRanking("starter");

    expect(emptyResult).toEqual({
      league: "starter",
      season: null,
      runners: [],
      isSampleData: false,
      error: null,
    });

    const errResult = await new HybridRankingRepository({
      getSupabase: () => null,
      isSupabaseConfigured: () => true,
    }).getLeagueRanking("starter");

    expect(errResult.error).toBe("network_error");
    expect(errResult.isSampleData).toBe(false);
  });
});
