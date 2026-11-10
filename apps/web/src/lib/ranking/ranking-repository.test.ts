import { describe, expect, it } from "vitest";
import {
  calculateDaysRemaining,
  getMockLeagueRanking,
  getMockSeason,
  rankingRepository,
} from "./index";

describe("Ranking repository and mock data (apps/web)", () => {
  it("calculates days remaining accurately", () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const { daysRemaining, isFinished } = calculateDaysRemaining(futureDate);
    expect(daysRemaining).toBe(5);
    expect(isFinished).toBe(false);

    const pastDate = new Date(Date.now() - 1000).toISOString();
    const pastResult = calculateDaysRemaining(pastDate);
    expect(pastResult.daysRemaining).toBe(0);
    expect(pastResult.isFinished).toBe(true);
  });

  it("getMockSeason provides active season metadata", () => {
    const season = getMockSeason();
    expect(season.id).toBeDefined();
    expect(season.name).toBe("Temporada 1");
    expect(season.daysRemaining).toBeGreaterThan(0);
    expect(season.isFinished).toBe(false);
  });

  it("getMockLeagueRanking returns ordered runners for all leagues", () => {
    for (const league of ["starter", "intermediate", "advanced", "elite"] as const) {
      const data = getMockLeagueRanking(league);
      expect(data.league).toBe(league);
      expect(data.runners.length).toBeGreaterThanOrEqual(3);

      // Verify runners are ordered by rank
      for (let i = 0; i < data.runners.length - 1; i += 1) {
        expect(data.runners[i].rank).toBeLessThanOrEqual(data.runners[i + 1].rank);
        expect(data.runners[i].points).toBeGreaterThanOrEqual(data.runners[i + 1].points);
      }
    }
  });

  it("rankingRepository degrades gracefully when Supabase is not configured", async () => {
    const ranking = await rankingRepository.getLeagueRanking("advanced");
    expect(ranking.league).toBe("advanced");
    expect(ranking.runners.length).toBeGreaterThan(0);
    expect(ranking.runners[0].rank).toBe(1);
    expect(ranking.runners[0].points).toBeGreaterThan(0);
  });
});
