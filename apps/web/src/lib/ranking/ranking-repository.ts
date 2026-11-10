import {
  aggregateRankingData,
  type LeagueCode,
  type RankedRunner,
  type RankingCellOwnership,
  type RankingDailyPoint,
  type RankingProfile,
} from "@dubai-run/core";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { calculateDaysRemaining, getMockLeagueRanking } from "./mock-ranking";
import type { LeagueRankingData, SeasonInfo } from "./types";

export interface RankingRepository {
  getLeagueRanking(league: LeagueCode): Promise<LeagueRankingData>;
  getUserLeague(userId: string): Promise<LeagueCode | null>;
}

export class HybridRankingRepository implements RankingRepository {
  async getUserLeague(userId: string): Promise<LeagueCode | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const supabase = getSupabase();
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("user_leagues")
        .select("leagues(code)")
        .eq("user_id", userId)
        .order("valid_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      const leagueCode = (data.leagues as { code?: string } | null)?.code;
      if (
        leagueCode === "starter" ||
        leagueCode === "intermediate" ||
        leagueCode === "advanced" ||
        leagueCode === "elite"
      ) {
        return leagueCode as LeagueCode;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getLeagueRanking(league: LeagueCode): Promise<LeagueRankingData> {
    // 1. Unconfigured environment: provide realistic sample data with sample badge
    if (!isSupabaseConfigured()) {
      return getMockLeagueRanking(league);
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        return {
          league,
          season: null,
          runners: [],
          isSampleData: false,
          error: "network_error",
        };
      }

      // 2. Fetch the active season (Item 4: status = 'active')
      const { data: seasonData, error: seasonError } = await supabase
        .from("seasons")
        .select("id, name, starts_at, ends_at, status")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (seasonError) {
        return {
          league,
          season: null,
          runners: [],
          isSampleData: false,
          error: "network_error",
        };
      }

      // If no active season exists, return empty state (no fake season or fake runners)
      if (!seasonData) {
        return {
          league,
          season: null,
          runners: [],
          isSampleData: false,
          error: null,
        };
      }

      const { daysRemaining, isFinished } = calculateDaysRemaining(seasonData.ends_at);
      const season: SeasonInfo = {
        id: seasonData.id,
        name: seasonData.name,
        startsAt: seasonData.starts_at,
        endsAt: seasonData.ends_at,
        daysRemaining,
        isFinished,
      };

      // 3. Fetch league record for the given code
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("id, code")
        .eq("code", league)
        .maybeSingle();

      if (leagueError) {
        return {
          league,
          season,
          runners: [],
          isSampleData: false,
          error: "network_error",
        };
      }

      if (!leagueData) {
        return {
          league,
          season,
          runners: [],
          isSampleData: false,
          error: null,
        };
      }

      const leagueId = leagueData.id;
      const seasonId = seasonData.id;

      // 4. Fetch daily points for this season & league
      const { data: rawDailyPoints, error: dpError } = await supabase
        .from("daily_points")
        .select("user_id, points, day, cells_owned")
        .eq("season_id", seasonId)
        .eq("league_id", leagueId);

      if (dpError) {
        return {
          league,
          season,
          runners: [],
          isSampleData: false,
          error: "network_error",
        };
      }

      // 5. Fetch current cell ownerships
      const { data: rawOwnerships, error: ownError } = await supabase
        .from("cell_ownership")
        .select("owner_id, h3")
        .eq("season_id", seasonId)
        .eq("league_id", leagueId);

      if (ownError) {
        return {
          league,
          season,
          runners: [],
          isSampleData: false,
          error: "network_error",
        };
      }

      const dailyPoints: RankingDailyPoint[] = (rawDailyPoints || []).map((row) => ({
        userId: row.user_id,
        points: row.points,
        day: row.day,
        cellsOwned: row.cells_owned,
      }));

      const cellOwnerships: RankingCellOwnership[] = (rawOwnerships || []).map((row) => ({
        ownerId: row.owner_id,
        h3: row.h3,
      }));

      // Item 2: If there are no daily points or cell ownerships, return empty list (never invent runners!)
      if (dailyPoints.length === 0 && cellOwnerships.length === 0) {
        return {
          league,
          season,
          runners: [],
          isSampleData: false,
          error: null,
        };
      }

      // Item 7: Filter profiles with .in("id", userIds) of runners in this ranking only
      const userIds = Array.from(
        new Set([...dailyPoints.map((dp) => dp.userId), ...cellOwnerships.map((co) => co.ownerId)]),
      );

      let profiles: RankingProfile[] = [];
      if (userIds.length > 0) {
        const { data: rawProfiles, error: profError } = await supabase
          .from("profiles")
          .select("id, alias")
          .in("id", userIds);

        if (profError) {
          return {
            league,
            season,
            runners: [],
            isSampleData: false,
            error: "network_error",
          };
        }

        if (rawProfiles) {
          profiles = rawProfiles.map((p) => ({
            id: p.id,
            alias: p.alias,
          }));
        }
      }

      // Item 3: Do not query runs table from client (runs has no league_id and RLS restricts to self).
      // Valid runs empty array passed to domain logic; server view/RPC pending in future task.
      const runners: RankedRunner[] = aggregateRankingData({
        dailyPoints,
        cellOwnerships,
        validRuns: [],
        profiles,
        seasonStartsAt: seasonData.starts_at,
      });

      return {
        league,
        season,
        runners,
        isSampleData: false,
        error: null,
      };
    } catch {
      // Network/client exception: return network_error so the UI offers a retry button
      return {
        league,
        season: null,
        runners: [],
        isSampleData: false,
        error: "network_error",
      };
    }
  }
}

export const rankingRepository: RankingRepository = new HybridRankingRepository();
