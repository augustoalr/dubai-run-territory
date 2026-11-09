import type { LeagueCode } from "@dubai-run/core";

export type CellStatus = "mine" | "threatened" | "rival" | "free";

export type RunnerProfile = {
  alias: string;
  initials: string;
  isCurrentUser: boolean;
};

export type ThreatInfo = {
  rivalAlias: string;
  rivalInitials: string;
  rivalPaceFormatted: string;
  rivalPaceSeconds: number;
  gapSeconds: number;
};

export type TerritoryCell = {
  id: string; // H3 index
  status: CellStatus;
  owner: RunnerProfile | null;
  paceFormatted: string | null; // e.g. "5:12 /km"
  paceSeconds: number | null;
  achievedAtFormatted: string | null; // e.g. "24 oct 2026"
  achievedAtIso?: string | null;
  userBestPaceFormatted: string | null; // e.g. "5:25 /km"
  userBestPaceSeconds: number | null;
  gapSeconds: number | null; // Seconds difference needed to beat the current mark
  threat: ThreatInfo | null;
};

export type TerritoryStats = {
  mine: number;
  threatened: number;
  rival: number;
  free: number;
  total: number;
};

export type UserProfile = {
  alias: string;
  initials: string;
  league: LeagueCode;
};

export type TerritoryData = {
  league: LeagueCode;
  userProfile: UserProfile;
  cells: TerritoryCell[];
  stats: TerritoryStats;
};
