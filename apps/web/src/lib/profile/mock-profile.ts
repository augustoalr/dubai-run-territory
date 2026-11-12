import { CURRENT_USER } from "@/lib/territory/mock-data";
import type { ProfileLoadResult, ProfileRunItem, StealNoticeItem } from "./types";

const SAMPLE_RUNS: ProfileRunItem[] = [
  {
    id: "sample-run-1",
    createdAt: "2026-11-10T06:45:00Z",
    startedAt: "2026-11-10T05:30:00Z",
    distanceInZoneM: 6420,
    format: "gpx",
    status: "accepted",
    rejectCode: null,
  },
  {
    id: "sample-run-2",
    createdAt: "2026-11-08T17:10:00Z",
    startedAt: "2026-11-08T16:20:00Z",
    distanceInZoneM: 820,
    format: "fit",
    status: "accepted",
    rejectCode: "TOO_SHORT",
  },
  {
    id: "sample-run-3",
    createdAt: "2026-11-06T07:05:00Z",
    startedAt: "2026-11-06T06:00:00Z",
    distanceInZoneM: 4150,
    format: "fit",
    status: "review",
    rejectCode: "IMPOSSIBLE_PACE",
  },
  {
    id: "sample-run-4",
    createdAt: "2026-11-04T18:30:00Z",
    startedAt: "2026-11-04T17:45:00Z",
    distanceInZoneM: 3100,
    format: "gpx",
    status: "rejected",
    rejectCode: "GPS_SPIKES",
  },
  {
    id: "sample-run-5",
    createdAt: "2026-11-03T12:15:00Z",
    startedAt: null,
    distanceInZoneM: null,
    format: "fit",
    status: "pending",
    rejectCode: null,
  },
  {
    id: "sample-run-6",
    createdAt: "2026-11-01T09:00:00Z",
    startedAt: "2026-11-01T08:10:00Z",
    distanceInZoneM: 5000,
    format: "gpx",
    status: "voided",
    rejectCode: "DUPLICATE",
  },
];

const SAMPLE_STEAL_NOTICES: StealNoticeItem[] = [
  {
    id: "sample-steal-1",
    type: "steal",
    zoneId: "sample-zone-jumeirah-kite",
    leagueId: "sample-league-advanced",
    leagueCode: "advanced",
    seasonId: "sample-season-1",
    actorId: "sample-actor-1",
    actorAlias: "noor.pace",
    createdAt: "2026-11-11T05:45:00Z",
  },
  {
    id: "sample-steal-2",
    type: "steal",
    zoneId: "sample-zone-jumeirah-kite",
    leagueId: "sample-league-advanced",
    leagueCode: "advanced",
    seasonId: "sample-season-1",
    actorId: "sample-actor-2",
    actorAlias: "tariq.stride",
    createdAt: "2026-11-09T18:20:00Z",
  },
];

/**
 * Builds deterministic sample data for local/offline mode when Supabase is not configured.
 */
export function buildSampleProfileData(): ProfileLoadResult {
  return {
    status: "sample",
    isSampleData: true,
    error: null,
    runner: {
      id: "sample-runner",
      alias: CURRENT_USER.alias,
      createdAt: "2026-10-12T06:00:00Z",
    },
    season: {
      id: "sample-season-1",
      name: "Temporada 1",
    },
    leagueAssignment: {
      leagueId: "sample-league-advanced",
      code: CURRENT_USER.league,
      refPaceS: 288,
      validFrom: "2026-10-15T06:00:00Z",
    },
    ownedCellsCount: 14,
    runs: SAMPLE_RUNS,
    hasMoreRuns: false,
    stealNotices: SAMPLE_STEAL_NOTICES,
  };
}
