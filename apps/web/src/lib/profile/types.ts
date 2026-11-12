import type { LeagueCode } from "@dubai-run/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRunFormat = "gpx" | "fit";

export type ProfileRunStatus =
  "pending" | "processing" | "accepted" | "review" | "rejected" | "voided";

export interface ProfileRunner {
  id: string;
  alias: string | null;
  createdAt: string | null;
}

export interface ProfileSeasonInfo {
  id: string;
  name: string;
}

export interface ProfileLeagueAssignment {
  leagueId: string;
  code: LeagueCode;
  refPaceS: number;
  validFrom: string;
}

export interface ProfileRunItem {
  id: string;
  createdAt: string;
  startedAt: string | null;
  distanceInZoneM: number | null;
  format: ProfileRunFormat;
  status: ProfileRunStatus;
  rejectCode: string | null;
}

export interface StealNoticeItem {
  id: string;
  type: "steal";
  zoneId: string;
  leagueId: string;
  leagueCode: LeagueCode | null;
  seasonId: string;
  actorId: string;
  actorAlias: string | null;
  createdAt: string;
}

export interface ProfileRunsPageResult {
  runs: ProfileRunItem[];
  hasMore: boolean;
  error: "network_error" | null;
}

export interface ProfileReadyPayload {
  runner: ProfileRunner;
  season: ProfileSeasonInfo | null;
  leagueAssignment: ProfileLeagueAssignment | null;
  ownedCellsCount: number;
  runs: ProfileRunItem[];
  hasMoreRuns: boolean;
  stealNotices: StealNoticeItem[];
}

export type ProfileLoadResult =
  | ({
      status: "sample";
      isSampleData: true;
      error: null;
    } & ProfileReadyPayload)
  | {
      status: "unauthenticated";
      isSampleData: false;
      error: null;
      runner: null;
      season: null;
      leagueAssignment: null;
      ownedCellsCount: 0;
      runs: [];
      hasMoreRuns: false;
      stealNotices: [];
    }
  | ({
      status: "ready";
      isSampleData: false;
      error: null;
    } & ProfileReadyPayload)
  | {
      status: "error";
      isSampleData: false;
      error: "network_error";
      runner: null;
      season: null;
      leagueAssignment: null;
      ownedCellsCount: 0;
      runs: [];
      hasMoreRuns: false;
      stealNotices: [];
    };

export type ProfileRepositoryDeps = {
  getSupabase: () => SupabaseClient | null;
  isSupabaseConfigured: () => boolean;
  now: () => number;
};

export interface ProfileRepository {
  getProfileData(currentUserId: string | null, pageSize?: number): Promise<ProfileLoadResult>;
  loadMoreRuns(
    currentUserId: string | null,
    offset: number,
    pageSize?: number,
  ): Promise<ProfileRunsPageResult>;
}
