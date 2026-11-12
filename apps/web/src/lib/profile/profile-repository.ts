import { jumeirahKiteZone, type LeagueCode } from "@dubai-run/core";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { buildSampleProfileData } from "./mock-profile";
import type {
  ProfileLeagueAssignment,
  ProfileLoadResult,
  ProfileRepository,
  ProfileRepositoryDeps,
  ProfileRunFormat,
  ProfileRunItem,
  ProfileRunStatus,
  ProfileRunsPageResult,
  StealNoticeItem,
} from "./types";

export const DEFAULT_RUNS_PAGE_SIZE = 20;
const STEAL_NOTICES_LIMIT = 20;
const JUMEIRAH_KITE_SLUG = jumeirahKiteZone.slug;

type ProfileRow = {
  id: string;
  alias: string | null;
  created_at: string;
};

type ActorProfileRow = {
  id: string;
  alias: string | null;
};

type ZoneRow = {
  id: string;
  slug: string;
  timezone: string;
};

type SeasonRow = {
  id: string;
  name: string;
  status: string;
};

type LeaguesJoin = { code?: string } | { code?: string }[] | null | undefined;

type UserLeagueRow = {
  league_id: string;
  ref_pace_s: number;
  valid_from: string;
  leagues: LeaguesJoin;
};

type RunRow = {
  id: string;
  created_at: string;
  started_at: string | null;
  distance_in_zone_m: number | null;
  format: string;
  status: string;
  reject_code: string | null;
};

type StealEventRow = {
  id: string;
  type: string;
  zone_id: string;
  league_id: string;
  season_id: string;
  actor_id: string;
  created_at: string;
  leagues: LeaguesJoin;
};

export class HybridProfileRepository implements ProfileRepository {
  private readonly deps: ProfileRepositoryDeps;

  constructor(deps: Partial<ProfileRepositoryDeps> = {}) {
    this.deps = {
      getSupabase: deps.getSupabase ?? getSupabase,
      isSupabaseConfigured: deps.isSupabaseConfigured ?? isSupabaseConfigured,
      now: deps.now ?? (() => Date.now()),
    };
  }

  async getProfileData(
    currentUserId: string | null,
    pageSize = DEFAULT_RUNS_PAGE_SIZE,
  ): Promise<ProfileLoadResult> {
    if (!this.deps.isSupabaseConfigured()) {
      return buildSampleProfileData();
    }

    if (!currentUserId) {
      return buildUnauthenticatedResult();
    }

    const normalizedPageSize = Math.max(1, Math.floor(pageSize));

    try {
      const supabase = this.deps.getSupabase();
      if (!supabase) {
        return buildErrorResult();
      }

      // 1. Fetch own profile (without is_admin), zone (without status='active' filter), and first page of runs
      const [profileRes, zoneRes, runsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, alias, created_at")
          .eq("id", currentUserId)
          .maybeSingle(),
        supabase
          .from("zones")
          .select("id, slug, timezone")
          .eq("slug", JUMEIRAH_KITE_SLUG)
          .maybeSingle(),
        supabase
          .from("runs")
          .select("id, created_at, started_at, distance_in_zone_m, format, status, reject_code")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(0, normalizedPageSize),
      ]);

      if (profileRes.error || zoneRes.error || runsRes.error) {
        return buildErrorResult();
      }

      const profileData = profileRes.data as ProfileRow | null;
      const runner = {
        id: profileData?.id ?? currentUserId,
        alias: profileData?.alias ?? null,
        createdAt: profileData?.created_at ?? null,
      };

      const { runs, hasMore: hasMoreRuns } = parseRunsPage(
        (runsRes.data as RunRow[] | null) ?? [],
        normalizedPageSize,
      );

      const zone = zoneRes.data as ZoneRow | null;

      // 2. Fetch active season (if zone exists) and steal notices (filtered by zone_id when zone exists)
      let eventsQuery = supabase
        .from("ownership_events")
        .select("id, type, zone_id, league_id, season_id, actor_id, created_at, leagues(code)")
        .eq("type", "steal")
        .eq("prev_owner_id", currentUserId);

      if (zone) {
        eventsQuery = eventsQuery.eq("zone_id", zone.id);
      }

      const eventsPromise = eventsQuery
        .order("created_at", { ascending: false })
        .limit(STEAL_NOTICES_LIMIT);

      const [seasonRes, eventsRes] = zone
        ? await Promise.all([
            supabase
              .from("seasons")
              .select("id, name, status")
              .eq("zone_id", zone.id)
              .eq("status", "active")
              .maybeSingle(),
            eventsPromise,
          ])
        : [{ data: null, error: null }, await eventsPromise];

      if (seasonRes.error || eventsRes.error) {
        return buildErrorResult();
      }

      const seasonData = seasonRes.data as SeasonRow | null;
      const season = seasonData ? { id: seasonData.id, name: seasonData.name } : null;

      const stealRows = ((eventsRes.data as StealEventRow[] | null) ?? []).filter(
        (row) => row.type === "steal",
      );
      const actorIds = Array.from(new Set(stealRows.map((row) => row.actor_id)));

      // 3. Fetch active league assignment (only if active season exists) and thief aliases (only if actorIds non-empty)
      const nowMs = this.deps.now();
      const nowIso = new Date(nowMs).toISOString();

      const userLeaguePromise =
        zone && season
          ? supabase
              .from("user_leagues")
              .select("league_id, ref_pace_s, valid_from, leagues(code)")
              .eq("user_id", currentUserId)
              .eq("season_id", season.id)
              .lte("valid_from", nowIso)
              .order("valid_from", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

      const actorProfilesPromise =
        actorIds.length > 0
          ? supabase.from("profiles").select("id, alias").in("id", actorIds)
          : Promise.resolve({ data: [] as ActorProfileRow[], error: null });

      const [userLeagueRes, actorProfilesRes] = await Promise.all([
        userLeaguePromise,
        actorProfilesPromise,
      ]);

      if (userLeagueRes.error || actorProfilesRes.error) {
        return buildErrorResult();
      }

      const leagueAssignment = parseUserLeagueAssignment(
        userLeagueRes.data as UserLeagueRow | null,
        nowMs,
      );

      const actorAliasById = new Map<string, string | null>();
      for (const actor of (actorProfilesRes.data as ActorProfileRow[] | null) ?? []) {
        actorAliasById.set(actor.id, actor.alias ?? null);
      }

      const stealNotices: StealNoticeItem[] = stealRows.map((row) => ({
        id: row.id,
        type: "steal",
        zoneId: row.zone_id,
        leagueId: row.league_id,
        leagueCode: extractLeagueCode(row.leagues),
        seasonId: row.season_id,
        actorId: row.actor_id,
        actorAlias: actorAliasById.get(row.actor_id) ?? null,
        createdAt: row.created_at,
      }));

      // 4. Count owned cells in jumeirah-kite for active season and current league using h3 (cell_ownership has no id column)
      let ownedCellsCount = 0;
      if (zone && season && leagueAssignment) {
        const { count, error: countError } = await supabase
          .from("cell_ownership")
          .select("h3", { count: "exact", head: true })
          .eq("zone_id", zone.id)
          .eq("season_id", season.id)
          .eq("league_id", leagueAssignment.leagueId)
          .eq("owner_id", currentUserId);

        if (countError) {
          return buildErrorResult();
        }

        ownedCellsCount = typeof count === "number" ? count : 0;
      }

      return {
        status: "ready",
        isSampleData: false,
        error: null,
        runner,
        season,
        leagueAssignment,
        ownedCellsCount,
        runs,
        hasMoreRuns,
        stealNotices,
      };
    } catch {
      return buildErrorResult();
    }
  }

  async loadMoreRuns(
    currentUserId: string | null,
    offset: number,
    pageSize = DEFAULT_RUNS_PAGE_SIZE,
  ): Promise<ProfileRunsPageResult> {
    if (!this.deps.isSupabaseConfigured() || !currentUserId) {
      return { runs: [], hasMore: false, error: null };
    }

    const normalizedOffset = Math.max(0, Math.floor(offset));
    const normalizedPageSize = Math.max(1, Math.floor(pageSize));

    try {
      const supabase = this.deps.getSupabase();
      if (!supabase) {
        return { runs: [], hasMore: false, error: "network_error" };
      }

      const { data, error } = await supabase
        .from("runs")
        .select("id, created_at, started_at, distance_in_zone_m, format, status, reject_code")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(normalizedOffset, normalizedOffset + normalizedPageSize);

      if (error) {
        return { runs: [], hasMore: false, error: "network_error" };
      }

      const { runs, hasMore } = parseRunsPage((data as RunRow[] | null) ?? [], normalizedPageSize);
      return { runs, hasMore, error: null };
    } catch {
      return { runs: [], hasMore: false, error: "network_error" };
    }
  }
}

export const profileRepository: ProfileRepository = new HybridProfileRepository();

function buildUnauthenticatedResult(): ProfileLoadResult {
  return {
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
  };
}

function buildErrorResult(): ProfileLoadResult {
  return {
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
  };
}

function isLeagueCode(value: unknown): value is LeagueCode {
  return (
    value === "starter" || value === "intermediate" || value === "advanced" || value === "elite"
  );
}

function extractLeagueCode(leaguesJoin: LeaguesJoin): LeagueCode | null {
  const code = Array.isArray(leaguesJoin) ? leaguesJoin[0]?.code : leaguesJoin?.code;
  return isLeagueCode(code) ? code : null;
}

function parseUserLeagueAssignment(
  row: UserLeagueRow | null,
  nowMs: number,
): ProfileLeagueAssignment | null {
  if (!row) return null;

  const code = extractLeagueCode(row.leagues);
  if (!code) return null;

  const validFromMs = Date.parse(row.valid_from);
  if (Number.isFinite(validFromMs) && validFromMs > nowMs) {
    return null;
  }

  if (
    typeof row.ref_pace_s !== "number" ||
    !Number.isFinite(row.ref_pace_s) ||
    row.ref_pace_s <= 0
  ) {
    return null;
  }

  return {
    leagueId: row.league_id,
    code,
    refPaceS: row.ref_pace_s,
    validFrom: row.valid_from,
  };
}

function isRunFormat(value: unknown): value is ProfileRunFormat {
  return value === "gpx" || value === "fit";
}

function isRunStatus(value: unknown): value is ProfileRunStatus {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "accepted" ||
    value === "review" ||
    value === "rejected" ||
    value === "voided"
  );
}

function parseRunsPage(
  rows: readonly RunRow[],
  pageSize: number,
): { runs: ProfileRunItem[]; hasMore: boolean } {
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  const runs: ProfileRunItem[] = pageRows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    startedAt: row.started_at ?? null,
    distanceInZoneM:
      typeof row.distance_in_zone_m === "number" && Number.isFinite(row.distance_in_zone_m)
        ? row.distance_in_zone_m
        : null,
    format: isRunFormat(row.format) ? row.format : "gpx",
    status: isRunStatus(row.status) ? row.status : "pending",
    rejectCode:
      typeof row.reject_code === "string" && row.reject_code.length > 0 ? row.reject_code : null,
  }));

  return { runs, hasMore };
}
