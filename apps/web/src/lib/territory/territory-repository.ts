import { cellsForZone, jumeirahKiteZone, type LeagueCode } from "@dubai-run/core";
import { buildTerritoryData, CURRENT_USER } from "./mock-data";
import type { TerritoryData, UserProfile } from "./types";

/**
 * Interface that decouples the UI from the underlying data source.
 * Currently backed by LocalTerritoryRepository with realistic sample data.
 * Ready to be implemented by SupabaseTerritoryRepository in future tasks.
 */
export interface TerritoryRepository {
  getUserProfile(): UserProfile;
  getTerritoryData(league: LeagueCode): TerritoryData;
}

export class LocalTerritoryRepository implements TerritoryRepository {
  private userProfile: UserProfile;

  constructor(userProfile: UserProfile = CURRENT_USER) {
    this.userProfile = userProfile;
  }

  getUserProfile(): UserProfile {
    return this.userProfile;
  }

  getTerritoryData(league: LeagueCode): TerritoryData {
    const cells = cellsForZone(jumeirahKiteZone);
    const centerline = jumeirahKiteZone.centerline?.coordinates ?? [];
    return buildTerritoryData(cells, centerline, league, this.userProfile);
  }
}

// Default singleton repository
export const territoryRepository: TerritoryRepository = new LocalTerritoryRepository();
