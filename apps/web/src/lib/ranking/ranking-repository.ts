import {
  aggregateRankingData,
  type LeagueCode,
  type RankedRunner,
  type RankingCellOwnership,
  type RankingDailyPoint,
  type RankingProfile,
  type RankingValidRun,
} from "@dubai-run/core";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { calculateDaysRemaining, getMockLeagueRanking } from "./mock-ranking";
import type { LeagueRankingData, SeasonInfo } from "./types";

export interface RankingRepository {
  getLeagueRanking(league: LeagueCode): Promise<LeagueRankingData>;
}

export class HybridRankingRepository implements RankingRepository {
  async getLeagueRanking(league: LeagueCode): Promise<LeagueRankingData> {
    // 1. Degraded / offline resilience: if Supabase is not configured, return realistic sample data
    if (!isSupabaseConfigured()) {
      return getMockLeagueRanking(league);
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        return getMockLeagueRanking(league);
      }

      // Fetch active season
      const { data: seasonData, error: seasonError } = await supabase
        .from("seasons")
        .select("id, name, starts_at, ends_at, status")
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (seasonError || !seasonData) {
        return getMockLeagueRanking(league);
      }

      // Fetch league record for the given code
      const { data: leagueData, error: leagueError } = await supabase
        .from("leagues")
        .select("id, code")
        .eq("code", league)
        .maybeSingle();

      if (leagueError || !leagueData) {
        return getMockLeagueRanking(league);
      }

      const leagueId = leagueData.id;
      const seasonId = seasonData.id;

      // Fetch daily points for this season & league
      const { data: rawDailyPoints, error: dpError } = await supabase
        .from("daily_points")
        .select("user_id, points, day, cells_owned")
        .eq("season_id", seasonId)
        .eq("league_id", leagueId);

      if (dpError) {
        return getMockLeagueRanking(league);
      }

      // Fetch current cell ownerships
      const { data: rawOwnerships } = await supabase
        .from("cell_ownership")
        .select("owner_id, h3")
        .eq("season_id", seasonId)
        .eq("league_id", leagueId);

      // Fetch valid runs for this season & league
      const { data: rawRuns } = await supabase
        .from("runs")
        .select("user_id, distance_in_zone_m, status")
        .eq("season_id", seasonId)
        .eq("league_id", leagueId)
        .eq("status", "accepted");

      // Fetch profiles
      const { data: rawProfiles } = await supabase.from("profiles").select("id, alias");

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

      const validRuns: RankingValidRun[] = (rawRuns || []).map((row) => ({
        userId: row.user_id,
        distanceInZoneMeters: row.distance_in_zone_m || 0,
      }));

      const profiles: RankingProfile[] = (rawProfiles || []).map((row) => ({
        id: row.id,
        alias: row.alias,
      }));

      // If there are no daily points or runs at all in the database, fallback to realistic mock
      if (dailyPoints.length === 0 && validRuns.length === 0 && cellOwnerships.length === 0) {
        return getMockLeagueRanking(league);
      }

      const runners: RankedRunner[] = aggregateRankingData({
        dailyPoints,
        cellOwnerships,
        validRuns,
        profiles,
        seasonStartsAt: seasonData.starts_at,
      });

      const { daysRemaining, isFinished } = calculateDaysRemaining(seasonData.ends_at);
      const season: SeasonInfo = {
        id: seasonData.id,
        name: seasonData.name,
        startsAt: seasonData.starts_at,
        endsAt: seasonData.ends_at,
        daysRemaining,
        isFinished,
      };

      return {
        league,
        season,
        runners,
      };
    } catch {
      // Catch any unexpected network / Supabase exception and degrade gracefully
      return getMockLeagueRanking(league);
    }
  }
}

export const rankingRepository: RankingRepository = new HybridRankingRepository();
