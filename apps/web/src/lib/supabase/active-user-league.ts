import { jumeirahKiteZone, type LeagueCode } from "@dubai-run/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface GetActiveUserLeagueParams {
  supabase: SupabaseClient;
  userId: string;
  nowMs: number;
  zoneSlug?: string;
}

type ZoneIdRow = {
  id?: unknown;
};

type SeasonIdRow = {
  id?: unknown;
};

type LeaguesJoin = { code?: unknown } | { code?: unknown }[] | null | undefined;

type UserLeagueRow = {
  valid_from?: unknown;
  leagues?: LeaguesJoin;
};

export function isLeagueCode(value: unknown): value is LeagueCode {
  return (
    value === "starter" || value === "intermediate" || value === "advanced" || value === "elite"
  );
}

/**
 * Resolves the active league code for a user in a zone's active season,
 * filtering user_leagues by season_id and valid_from <= nowMs.
 * Queries zones by slug without requiring status = 'active' (jumeirah-kite starts in 'draft').
 */
export async function getActiveUserLeague({
  supabase,
  userId,
  nowMs,
  zoneSlug = jumeirahKiteZone.slug,
}: GetActiveUserLeagueParams): Promise<LeagueCode | null> {
  if (!userId || !Number.isFinite(nowMs)) {
    return null;
  }

  try {
    const { data: zoneData, error: zoneError } = await supabase
      .from("zones")
      .select("id")
      .eq("slug", zoneSlug)
      .maybeSingle();

    const zoneId = (zoneData as ZoneIdRow | null)?.id;
    if (zoneError || typeof zoneId !== "string" || zoneId.length === 0) {
      return null;
    }

    const { data: seasonData, error: seasonError } = await supabase
      .from("seasons")
      .select("id")
      .eq("zone_id", zoneId)
      .eq("status", "active")
      .maybeSingle();

    const seasonId = (seasonData as SeasonIdRow | null)?.id;
    if (seasonError || typeof seasonId !== "string" || seasonId.length === 0) {
      return null;
    }

    const nowIso = new Date(nowMs).toISOString();
    const { data: leagueData, error: leagueError } = await supabase
      .from("user_leagues")
      .select("valid_from, leagues(code)")
      .eq("user_id", userId)
      .eq("season_id", seasonId)
      .lte("valid_from", nowIso)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (leagueError || !leagueData) {
      return null;
    }

    const row = leagueData as UserLeagueRow;
    if (typeof row.valid_from !== "string") {
      return null;
    }

    const validFromMs = Date.parse(row.valid_from);
    if (!Number.isFinite(validFromMs) || validFromMs > nowMs) {
      return null;
    }

    const leaguesJoin = row.leagues;
    const code = Array.isArray(leaguesJoin) ? leaguesJoin[0]?.code : leaguesJoin?.code;

    return isLeagueCode(code) ? code : null;
  } catch {
    return null;
  }
}
