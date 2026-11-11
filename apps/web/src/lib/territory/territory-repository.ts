import {
  DECAY_GRACE_DAYS,
  cellsForZone,
  diffGameDays,
  formatPace,
  jumeirahKiteZone,
  type LeagueCode,
} from "@dubai-run/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { computeTerritoryStats, getInitials, sortCellsAlongCenterline } from "./helpers";
import { CURRENT_USER, buildTerritoryData } from "./mock-data";
import type { TerritoryCell, TerritoryData } from "./types";

const JUMEIRAH_KITE_SLUG = jumeirahKiteZone.slug;
const PAGE_SIZE = 1000;

export interface TerritoryRepository {
  getUserLeague(userId: string): Promise<LeagueCode | null>;
  getTerritoryData(league: LeagueCode, currentUserId: string | null): Promise<TerritoryData>;
}

export type TerritoryRepositoryDeps = {
  getSupabase: () => SupabaseClient | null;
  isSupabaseConfigured: () => boolean;
  now: () => number;
};

type ZoneRow = {
  id: string;
  slug: string;
  timezone: string;
};

type ZoneCellRow = {
  h3: string;
};

type SeasonRow = {
  id: string;
  name: string;
  status: string;
};

type LeagueRow = {
  id: string;
  code: string;
  zone_id: string | null;
};

type OwnershipRow = {
  h3: string;
  owner_id: string;
  pace_s: number;
  achieved_at: string;
  since: string;
};

type EffortRow = {
  h3: string;
  crossed_at: string;
  pace_s: number;
};

type ProfileRow = {
  id: string;
  alias: string | null;
};

type OwnCellAggregate = {
  lastCrossedAt: string | null;
  lastCrossedMs: number;
  bestPaceS: number;
};

type PageQuery<T> = PromiseLike<{ data: T[] | null; error: unknown }> & {
  range?: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
};

export class HybridTerritoryRepository implements TerritoryRepository {
  private readonly deps: TerritoryRepositoryDeps;

  constructor(deps: Partial<TerritoryRepositoryDeps> = {}) {
    this.deps = {
      getSupabase: deps.getSupabase ?? getSupabase,
      isSupabaseConfigured: deps.isSupabaseConfigured ?? isSupabaseConfigured,
      now: deps.now ?? (() => Date.now()),
    };
  }

  async getUserLeague(userId: string): Promise<LeagueCode | null> {
    if (!this.deps.isSupabaseConfigured()) return null;

    try {
      const supabase = this.deps.getSupabase();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("user_leagues")
        .select("leagues(code)")
        .eq("user_id", userId)
        .order("valid_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const leaguesJoin = (data as { leagues?: { code?: string } | { code?: string }[] | null })
        .leagues;
      const code = Array.isArray(leaguesJoin) ? leaguesJoin[0]?.code : leaguesJoin?.code;

      return isLeagueCode(code) ? code : null;
    } catch {
      return null;
    }
  }

  async getTerritoryData(league: LeagueCode, currentUserId: string | null): Promise<TerritoryData> {
    const centerline = jumeirahKiteZone.centerline?.coordinates ?? [];

    if (!this.deps.isSupabaseConfigured()) {
      const cells = cellsForZone(jumeirahKiteZone);
      return buildTerritoryData(cells, centerline, league, CURRENT_USER);
    }

    try {
      const supabase = this.deps.getSupabase();
      if (!supabase) {
        return buildErrorTerritoryData(league);
      }

      // Query zone by slug without requiring status = 'active' (seed keeps jumeirah-kite in 'draft')
      const { data: zoneData, error: zoneError } = await supabase
        .from("zones")
        .select("id, slug, timezone")
        .eq("slug", JUMEIRAH_KITE_SLUG)
        .maybeSingle();

      const zone = zoneData as ZoneRow | null;
      if (zoneError || !zone) {
        return buildErrorTerritoryData(league);
      }

      const [zoneCellsResult, seasonQueryResult, leaguesQueryResult] = await Promise.all([
        fetchAllRows<ZoneCellRow>(() =>
          supabase
            .from("zone_cells")
            .select("h3")
            .eq("zone_id", zone.id)
            .order("h3", { ascending: true }),
        ),
        supabase
          .from("seasons")
          .select("id, name, status")
          .eq("zone_id", zone.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
        supabase.from("leagues").select("id, code, zone_id").eq("code", league),
      ]);

      if (zoneCellsResult.error || seasonQueryResult.error || leaguesQueryResult.error) {
        return buildErrorTerritoryData(league);
      }

      const orderedCellIds = sortCellsAlongCenterline(
        zoneCellsResult.rows.map((row) => row.h3),
        centerline,
      );

      const season = seasonQueryResult.data as SeasonRow | null;
      if (!season) {
        const freeCells = orderedCellIds.map((h3) => createFreeCell(h3, null));
        return {
          league,
          userProfile: null,
          seasonName: null,
          hasActiveSeason: false,
          cells: freeCells,
          stats: computeTerritoryStats(freeCells),
          isSampleData: false,
          error: null,
        };
      }

      const leagueRows = (leaguesQueryResult.data as LeagueRow[] | null) ?? [];
      const matchingLeague =
        leagueRows.find((row) => row.zone_id === zone.id) ??
        leagueRows.find((row) => row.zone_id === null) ??
        null;

      if (!matchingLeague) {
        const freeCells = orderedCellIds.map((h3) => createFreeCell(h3, null));
        return {
          league,
          userProfile: null,
          seasonName: season.name,
          hasActiveSeason: true,
          cells: freeCells,
          stats: computeTerritoryStats(freeCells),
          isSampleData: false,
          error: null,
        };
      }

      const [ownershipResult, ownEffortsResult] = await Promise.all([
        fetchAllRows<OwnershipRow>(() =>
          supabase
            .from("cell_ownership")
            .select("h3, owner_id, pace_s, achieved_at, since")
            .eq("zone_id", zone.id)
            .eq("season_id", season.id)
            .eq("league_id", matchingLeague.id)
            .order("h3", { ascending: true }),
        ),
        currentUserId
          ? fetchAllRows<EffortRow>(() =>
              supabase
                .from("cell_efforts")
                .select("h3, crossed_at, pace_s")
                .eq("user_id", currentUserId)
                .eq("zone_id", zone.id)
                .eq("season_id", season.id)
                .eq("league_id", matchingLeague.id)
                .order("id", { ascending: true }),
            )
          : Promise.resolve({ rows: [] as EffortRow[], error: false }),
      ]);

      if (ownershipResult.error || ownEffortsResult.error) {
        return buildErrorTerritoryData(league);
      }

      const ownerIds = Array.from(new Set(ownershipResult.rows.map((row) => row.owner_id)));
      const profileAliasById = new Map<string, string | null>();

      if (ownerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, alias")
          .in("id", ownerIds);

        if (profilesError) {
          return buildErrorTerritoryData(league);
        }

        for (const profile of (profilesData as ProfileRow[] | null) ?? []) {
          profileAliasById.set(profile.id, profile.alias);
        }
      }

      const ownershipByH3 = new Map<string, OwnershipRow>();
      for (const row of ownershipResult.rows) {
        ownershipByH3.set(row.h3, row);
      }

      const ownEffortsByH3 = aggregateOwnEfforts(ownEffortsResult.rows);
      const nowMs = this.deps.now();

      const cells = orderedCellIds.map((h3) =>
        mapCellState({
          h3,
          ownership: ownershipByH3.get(h3) ?? null,
          ownStats: currentUserId ? (ownEffortsByH3.get(h3) ?? null) : null,
          ownerAlias: ownershipByH3.has(h3)
            ? (profileAliasById.get(ownershipByH3.get(h3)!.owner_id) ?? null)
            : null,
          currentUserId,
          nowMs,
        }),
      );

      return {
        league,
        userProfile: null,
        seasonName: season.name,
        hasActiveSeason: true,
        cells,
        stats: computeTerritoryStats(cells),
        isSampleData: false,
        error: null,
      };
    } catch {
      return buildErrorTerritoryData(league);
    }
  }
}

export const territoryRepository: TerritoryRepository = new HybridTerritoryRepository();

function isLeagueCode(value: unknown): value is LeagueCode {
  return (
    value === "starter" || value === "intermediate" || value === "advanced" || value === "elite"
  );
}

function buildErrorTerritoryData(league: LeagueCode): TerritoryData {
  return {
    league,
    userProfile: null,
    seasonName: null,
    hasActiveSeason: false,
    cells: [],
    stats: { mine: 0, threatened: 0, rival: 0, free: 0, total: 0 },
    isSampleData: false,
    error: "network_error",
  };
}

async function fetchAllRows<T>(
  makeQuery: () => PageQuery<T>,
): Promise<{ rows: T[]; error: boolean }> {
  const firstQuery = makeQuery();
  if (typeof firstQuery.range !== "function") {
    const { data, error } = await firstQuery;
    if (error) return { rows: [], error: true };
    return { rows: data ?? [], error: false };
  }

  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const query = makeQuery();
    const { data, error } = await query.range!(from, from + PAGE_SIZE - 1);
    if (error) {
      return { rows: [], error: true };
    }
    const batch = data ?? [];
    allRows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return { rows: allRows, error: false };
}

function aggregateOwnEfforts(rows: readonly EffortRow[]): Map<string, OwnCellAggregate> {
  const byH3 = new Map<string, OwnCellAggregate>();

  for (const row of rows) {
    const parsedMs = Date.parse(row.crossed_at);
    const validMs = Number.isNaN(parsedMs) ? Number.NEGATIVE_INFINITY : parsedMs;
    const existing = byH3.get(row.h3);

    if (!existing) {
      byH3.set(row.h3, {
        lastCrossedAt: Number.isFinite(validMs) ? row.crossed_at : null,
        lastCrossedMs: validMs,
        bestPaceS: row.pace_s,
      });
      continue;
    }

    const shouldUpdateDate = Number.isFinite(validMs) && validMs > existing.lastCrossedMs;
    byH3.set(row.h3, {
      lastCrossedAt: shouldUpdateDate ? row.crossed_at : existing.lastCrossedAt,
      lastCrossedMs: shouldUpdateDate ? validMs : existing.lastCrossedMs,
      bestPaceS: Math.min(existing.bestPaceS, row.pace_s),
    });
  }

  return byH3;
}

function isOwnCellThreatened(lastCrossedAt: string | null, nowMs: number): boolean {
  if (!lastCrossedAt) return false;
  const parsedMs = Date.parse(lastCrossedAt);
  if (Number.isNaN(parsedMs)) return false;
  return diffGameDays(parsedMs, nowMs) > DECAY_GRACE_DAYS;
}

function computeRivalGapSeconds(ownerPaceS: number, ownBestPaceS: number | null): number | null {
  if (ownBestPaceS === null) return null;
  if (ownBestPaceS < ownerPaceS) return 0;
  return ownBestPaceS - ownerPaceS + 1;
}

function createFreeCell(h3: string, ownStats: OwnCellAggregate | null): TerritoryCell {
  return {
    id: h3,
    status: "free",
    owner: null,
    paceFormatted: null,
    paceSeconds: null,
    achievedAtFormatted: null,
    achievedAtIso: null,
    userBestPaceFormatted: ownStats ? `${formatPace(ownStats.bestPaceS)} /km` : null,
    userBestPaceSeconds: ownStats ? ownStats.bestPaceS : null,
    gapSeconds: null,
    threat: null,
  };
}

function mapCellState(params: {
  h3: string;
  ownership: OwnershipRow | null;
  ownStats: OwnCellAggregate | null;
  ownerAlias: string | null;
  currentUserId: string | null;
  nowMs: number;
}): TerritoryCell {
  const { h3, ownership, ownStats, ownerAlias, currentUserId, nowMs } = params;

  if (!ownership) {
    return createFreeCell(h3, ownStats);
  }

  const isOwnCell = currentUserId !== null && ownership.owner_id === currentUserId;
  const paceFormatted = `${formatPace(ownership.pace_s)} /km`;
  const owner = {
    alias: ownerAlias,
    initials: ownerAlias ? getInitials(ownerAlias) : "??",
    isCurrentUser: isOwnCell,
  };

  if (!isOwnCell) {
    return {
      id: h3,
      status: "rival",
      owner,
      paceFormatted,
      paceSeconds: ownership.pace_s,
      achievedAtFormatted: null,
      achievedAtIso: ownership.achieved_at,
      userBestPaceFormatted: ownStats ? `${formatPace(ownStats.bestPaceS)} /km` : null,
      userBestPaceSeconds: ownStats ? ownStats.bestPaceS : null,
      gapSeconds: computeRivalGapSeconds(ownership.pace_s, ownStats?.bestPaceS ?? null),
      threat: null,
    };
  }

  const threatened = isOwnCellThreatened(ownStats?.lastCrossedAt ?? null, nowMs);
  const ownBestPaceS = ownStats ? ownStats.bestPaceS : ownership.pace_s;

  return {
    id: h3,
    status: threatened ? "threatened" : "mine",
    owner,
    paceFormatted,
    paceSeconds: ownership.pace_s,
    achievedAtFormatted: null,
    achievedAtIso: ownership.achieved_at,
    userBestPaceFormatted: `${formatPace(ownBestPaceS)} /km`,
    userBestPaceSeconds: ownBestPaceS,
    gapSeconds: null,
    threat: null,
  };
}
