import type { LeagueCode, RankedRunner } from "@dubai-run/core";

export interface SeasonInfo {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  daysRemaining: number;
  isFinished: boolean;
}

export interface LeagueRankingData {
  league: LeagueCode;
  season: SeasonInfo | null;
  runners: RankedRunner[];
  isSampleData: boolean;
  error?: "network_error" | null;
}
