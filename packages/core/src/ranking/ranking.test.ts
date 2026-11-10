import { describe, expect, it } from "vitest";
import {
  aggregateRankingData,
  areCriteriaEqual,
  calculateRanking,
  compareRankingCandidates,
  normalizeTimestamp,
} from "./index";
import type { RankingCandidate } from "./types";

describe("Ranking domain logic (T-17)", () => {
  describe("Criterion 1: Total accumulated points", () => {
    it("ranks runner with higher points above runner with fewer points", () => {
      const runnerA: RankingCandidate = {
        userId: "user-a",
        alias: "alice",
        points: 150,
        cellsOwned: 2,
        distanceInZoneMeters: 10_000,
        achievedAt: "2026-11-05T12:00:00Z",
      };
      const runnerB: RankingCandidate = {
        userId: "user-b",
        alias: "bob",
        points: 200,
        cellsOwned: 1, // fewer cells
        distanceInZoneMeters: 5_000, // less distance
        achievedAt: "2026-11-06T12:00:00Z", // later date
      };

      const ranked = calculateRanking([runnerA, runnerB]);
      expect(ranked).toHaveLength(2);
      expect(ranked[0]?.userId).toBe("user-b");
      expect(ranked[0]?.rank).toBe(1);
      expect(ranked[0]?.points).toBe(200);
      expect(ranked[1]?.userId).toBe("user-a");
      expect(ranked[1]?.rank).toBe(2);
      expect(ranked[1]?.points).toBe(150);
    });

    it("orders multiple runners descending by points", () => {
      const candidates: RankingCandidate[] = [
        { userId: "u1", points: 50, cellsOwned: 0, distanceInZoneMeters: 0, achievedAt: "2026-11-01" },
        { userId: "u2", points: 120, cellsOwned: 0, distanceInZoneMeters: 0, achievedAt: "2026-11-01" },
        { userId: "u3", points: 85, cellsOwned: 0, distanceInZoneMeters: 0, achievedAt: "2026-11-01" },
      ];

      const ranked = calculateRanking(candidates);
      expect(ranked.map((r) => r.userId)).toEqual(["u2", "u3", "u1"]);
      expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    });
  });

  describe("Tiebreaker 1: Cells owned at closing/current", () => {
    it("breaks points tie by cells owned (more cells ranks higher)", () => {
      const runnerA: RankingCandidate = {
        userId: "user-a",
        alias: "alice",
        points: 100,
        cellsOwned: 15,
        distanceInZoneMeters: 8_000, // less distance
        achievedAt: "2026-11-05T12:00:00Z", // later date
      };
      const runnerB: RankingCandidate = {
        userId: "user-b",
        alias: "bob",
        points: 100,
        cellsOwned: 10,
        distanceInZoneMeters: 20_000, // more distance
        achievedAt: "2026-11-02T12:00:00Z", // earlier date
      };

      const ranked = calculateRanking([runnerB, runnerA]);
      expect(ranked[0]?.userId).toBe("user-a");
      expect(ranked[0]?.rank).toBe(1);
      expect(ranked[0]?.cellsOwned).toBe(15);
      expect(ranked[1]?.userId).toBe("user-b");
      expect(ranked[1]?.rank).toBe(2);
      expect(ranked[1]?.cellsOwned).toBe(10);
    });
  });

  describe("Tiebreaker 2: Kilometers accumulated in valid runs in zone", () => {
    it("breaks points & cells tie by accumulated distance in zone", () => {
      const runnerA: RankingCandidate = {
        userId: "user-a",
        alias: "alice",
        points: 100,
        cellsOwned: 10,
        distanceInZoneMeters: 25_000, // 25 km
        achievedAt: "2026-11-05T12:00:00Z", // later date
      };
      const runnerB: RankingCandidate = {
        userId: "user-b",
        alias: "bob",
        points: 100,
        cellsOwned: 10,
        distanceInZoneMeters: 21_500, // 21.5 km
        achievedAt: "2026-11-02T12:00:00Z", // earlier date
      };

      const ranked = calculateRanking([runnerB, runnerA]);
      expect(ranked[0]?.userId).toBe("user-a");
      expect(ranked[0]?.rank).toBe(1);
      expect(ranked[0]?.distanceInZoneKm).toBe(25);
      expect(ranked[1]?.userId).toBe("user-b");
      expect(ranked[1]?.rank).toBe(2);
      expect(ranked[1]?.distanceInZoneKm).toBe(21.5);
    });
  });

  describe("Tiebreaker 3: Seniority (who reached the score first)", () => {
    it("breaks points, cells & distance tie by who reached score first (earlier timestamp)", () => {
      const runnerEarly: RankingCandidate = {
        userId: "user-early",
        alias: "early.bird",
        points: 100,
        cellsOwned: 10,
        distanceInZoneMeters: 20_000,
        achievedAt: "2026-11-01T10:00:00Z", // 1 Nov
      };
      const runnerLate: RankingCandidate = {
        userId: "user-late",
        alias: "late.comer",
        points: 100,
        cellsOwned: 10,
        distanceInZoneMeters: 20_000,
        achievedAt: "2026-11-03T18:00:00Z", // 3 Nov
      };

      const ranked = calculateRanking([runnerLate, runnerEarly]);
      expect(ranked[0]?.userId).toBe("user-early");
      expect(ranked[0]?.rank).toBe(1);
      expect(ranked[1]?.userId).toBe("user-late");
      expect(ranked[1]?.rank).toBe(2);
    });

    it("supports Date instances and numeric millisecond timestamps", () => {
      const timeEarly = 1730455200000;
      const timeLate = 1730541600000;

      const runnerA: RankingCandidate = {
        userId: "user-a",
        points: 50,
        cellsOwned: 5,
        distanceInZoneMeters: 10_000,
        achievedAt: new Date(timeEarly),
      };
      const runnerB: RankingCandidate = {
        userId: "user-b",
        points: 50,
        cellsOwned: 5,
        distanceInZoneMeters: 10_000,
        achievedAt: timeLate,
      };

      const ranked = calculateRanking([runnerB, runnerA]);
      expect(ranked[0]?.userId).toBe("user-a");
      expect(ranked[1]?.userId).toBe("user-b");
    });
  });

  describe("Total tie & deterministic fallback", () => {
    it("shares competition rank when all 4 criteria are strictly identical", () => {
      const runner1: RankingCandidate = {
        userId: "user-beta",
        alias: "Beta",
        points: 80,
        cellsOwned: 8,
        distanceInZoneMeters: 15_000,
        achievedAt: "2026-11-02T12:00:00Z",
      };
      const runner2: RankingCandidate = {
        userId: "user-alpha",
        alias: "Alpha",
        points: 80,
        cellsOwned: 8,
        distanceInZoneMeters: 15_000,
        achievedAt: "2026-11-02T12:00:00Z",
      };
      const runner3: RankingCandidate = {
        userId: "user-gamma",
        alias: "Gamma",
        points: 60,
        cellsOwned: 6,
        distanceInZoneMeters: 10_000,
        achievedAt: "2026-11-02T12:00:00Z",
      };

      const ranked = calculateRanking([runner1, runner2, runner3]);
      // Deterministic sort puts alpha before beta
      expect(ranked[0]?.userId).toBe("user-alpha");
      expect(ranked[0]?.rank).toBe(1);
      expect(ranked[0]?.position).toBe(1);

      expect(ranked[1]?.userId).toBe("user-beta");
      expect(ranked[1]?.rank).toBe(1); // shared rank 1
      expect(ranked[1]?.position).toBe(2);

      expect(ranked[2]?.userId).toBe("user-gamma");
      expect(ranked[2]?.rank).toBe(3); // standard competition ranking skips rank 2
      expect(ranked[2]?.position).toBe(3);
    });

    it("areCriteriaEqual accurately detects equality", () => {
      const a: RankingCandidate = {
        userId: "u1",
        points: 10,
        cellsOwned: 2,
        distanceInZoneMeters: 5000,
        achievedAt: "2026-11-01T00:00:00Z",
      };
      const b: RankingCandidate = {
        userId: "u2",
        points: 10,
        cellsOwned: 2,
        distanceInZoneMeters: 5000,
        achievedAt: "2026-11-01T00:00:00Z",
      };
      expect(areCriteriaEqual(a, b)).toBe(true);

      expect(areCriteriaEqual({ ...a, points: 11 }, b)).toBe(false);
      expect(areCriteriaEqual({ ...a, cellsOwned: 3 }, b)).toBe(false);
      expect(areCriteriaEqual({ ...a, distanceInZoneMeters: 5001 }, b)).toBe(false);
      expect(areCriteriaEqual({ ...a, achievedAt: "2026-11-02T00:00:00Z" }, b)).toBe(false);
    });
  });

  describe("Edge cases & immutability", () => {
    it("returns empty array for empty or missing input", () => {
      expect(calculateRanking([])).toEqual([]);
      // @ts-expect-error test undefined
      expect(calculateRanking(undefined)).toEqual([]);
    });

    it("does not mutate the input array", () => {
      const original: RankingCandidate[] = [
        { userId: "u1", points: 10, cellsOwned: 1, distanceInZoneMeters: 1000, achievedAt: "2026-11-01" },
        { userId: "u2", points: 50, cellsOwned: 2, distanceInZoneMeters: 2000, achievedAt: "2026-11-01" },
      ];
      const snapshot = JSON.stringify(original);
      calculateRanking(original);
      expect(JSON.stringify(original)).toBe(snapshot);
    });

    it("handles safely zero or negative values", () => {
      const candidate: RankingCandidate = {
        userId: "u-neg",
        points: -10,
        cellsOwned: -5,
        distanceInZoneMeters: -100,
        achievedAt: "invalid-date",
      };

      const ranked = calculateRanking([candidate]);
      expect(ranked[0]?.points).toBe(0);
      expect(ranked[0]?.cellsOwned).toBe(0);
      expect(ranked[0]?.distanceInZoneMeters).toBe(0);
      expect(ranked[0]?.distanceInZoneKm).toBe(0);
      expect(ranked[0]?.achievedAt).toBe(new Date(0).toISOString());
    });

    it("normalizeTimestamp returns 0 on undefined, null or invalid strings", () => {
      expect(normalizeTimestamp(undefined)).toBe(0);
      expect(normalizeTimestamp(null)).toBe(0);
      expect(normalizeTimestamp("garbage")).toBe(0);
      expect(normalizeTimestamp(12345678)).toBe(12345678);
    });

    it("compareRankingCandidates returns 0 when candidate compares against itself", () => {
      const candidate: RankingCandidate = {
        userId: "self",
        points: 20,
        cellsOwned: 3,
        distanceInZoneMeters: 5000,
        achievedAt: "2026-11-01T00:00:00Z",
      };
      expect(compareRankingCandidates(candidate, candidate)).toBe(0);
    });
  });

  describe("aggregateRankingData", () => {
    it("correctly aggregates daily points, owned cells, runs, and profiles", () => {
      const dailyPoints = [
        { userId: "u1", day: "2026-11-01", points: 10 },
        { userId: "u1", day: "2026-11-02", points: 15 }, // total 25 pts, reached on 2026-11-02
        { userId: "u1", day: "2026-11-03", points: 0 },
        { userId: "u2", day: "2026-11-01", points: 25 }, // total 25 pts, reached on 2026-11-01 (seniority!)
      ];

      const cellOwnerships = [
        { ownerId: "u1", h3: "cell-1" },
        { ownerId: "u1", h3: "cell-2" },
        { ownerId: "u2", h3: "cell-3" },
        { ownerId: "u2", h3: "cell-4" },
      ];

      const validRuns = [
        { userId: "u1", distanceInZoneMeters: 5_000 },
        { userId: "u1", distanceInZoneMeters: 7_000 }, // total 12_000 m
        { userId: "u2", distanceInZoneMeters: 12_000 }, // total 12_000 m
      ];

      const profiles = [
        { id: "u1", alias: "runner.one" },
        { id: "u2", alias: "runner.two" },
      ];

      const ranked = aggregateRankingData({
        dailyPoints,
        cellOwnerships,
        validRuns,
        profiles,
        seasonStartsAt: "2026-10-19T00:00:00Z",
      });

      expect(ranked).toHaveLength(2);

      // Points: both 25
      // Cells: both 2
      // Km: both 12.00 km
      // Seniority: u2 achieved 25 pts on 2026-11-01, u1 achieved 25 pts on 2026-11-02
      // Therefore, u2 must be rank 1, u1 rank 2!
      expect(ranked[0]?.userId).toBe("u2");
      expect(ranked[0]?.alias).toBe("runner.two");
      expect(ranked[0]?.rank).toBe(1);
      expect(ranked[0]?.points).toBe(25);
      expect(ranked[0]?.cellsOwned).toBe(2);
      expect(ranked[0]?.distanceInZoneKm).toBe(12);

      expect(ranked[1]?.userId).toBe("u1");
      expect(ranked[1]?.alias).toBe("runner.one");
      expect(ranked[1]?.rank).toBe(2);
      expect(ranked[1]?.points).toBe(25);
      expect(ranked[1]?.cellsOwned).toBe(2);
      expect(ranked[1]?.distanceInZoneKm).toBe(12);
    });

    it("handles runners with zero points who logged distance", () => {
      const ranked = aggregateRankingData({
        dailyPoints: [],
        validRuns: [{ userId: "u-newbie", distanceInZoneMeters: 3500 }],
        profiles: [{ id: "u-newbie", alias: "newbie" }],
        seasonStartsAt: "2026-11-01T00:00:00Z",
      });

      expect(ranked).toHaveLength(1);
      expect(ranked[0]?.userId).toBe("u-newbie");
      expect(ranked[0]?.alias).toBe("newbie");
      expect(ranked[0]?.points).toBe(0);
      expect(ranked[0]?.distanceInZoneKm).toBe(3.5);
      expect(ranked[0]?.rank).toBe(1);
    });
  });
});
