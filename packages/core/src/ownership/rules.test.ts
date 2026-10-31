import { describe, expect, it } from "vitest";
import { diffGameDays, gulfGameDay } from "./day";
import {
  calculateDailyPoints,
  calculatePaceDecay,
  decideClaim,
  effectivePace,
  liberateTilesOnPromotion,
  type CellMark,
  type OwnedTile,
} from "./decide";

describe("T-27 Product Review Rules", () => {
  describe("Regla 1: Cierre del día a las 03:59 hora de Dubái", () => {
    it("asigna al día anterior cualquier hora hasta las 03:59:00 inclusive", () => {
      // 03:58 en Dubái (+04:00) es 23:58 UTC del día anterior
      expect(gulfGameDay("2026-11-03T03:58:00+04:00")).toBe("2026-11-02");
      // Exactamente las 03:59:00 en Dubái (minuto de cierre)
      expect(gulfGameDay("2026-11-03T03:59:00+04:00")).toBe("2026-11-02");
      // A las 04:00:00 ya arranca el día siguiente
      expect(gulfGameDay("2026-11-03T04:00:00+04:00")).toBe("2026-11-03");
      expect(gulfGameDay("2026-11-03T12:00:00+04:00")).toBe("2026-11-03");
    });

    it("calcula la diferencia de días de juego respetando el corte de las 03:59", () => {
      const tardeDia1 = "2026-11-02T18:00:00+04:00";
      const madrugadaDia1Cierre = "2026-11-03T03:59:00+04:00";
      const madrugadaDia2Inicio = "2026-11-03T04:00:00+04:00";

      // Misma jornada deportiva (0 días de diferencia)
      expect(diffGameDays(tardeDia1, madrugadaDia1Cierre)).toBe(0);
      // Siguiente jornada deportiva (1 día de diferencia)
      expect(diffGameDays(tardeDia1, madrugadaDia2Inicio)).toBe(1);
    });
  });

  describe("Regla 2: Debilitamiento (Decay)", () => {
    it("no debilita durante los primeros 7 días (días 0 a 7)", () => {
      for (let day = 0; day <= 7; day += 1) {
        expect(calculatePaceDecay(day)).toBe(0);
        expect(effectivePace(300, day)).toBe(300);
      }
    });

    it("caso límite: día 7 contra día 8", () => {
      const basePace = 300; // 5:00 /km

      // Día 7: sin debilitamiento (0 s/km)
      expect(calculatePaceDecay(7)).toBe(0);
      expect(effectivePace(basePace, 7)).toBe(300);

      // Día 8: debilitamiento de 5 s/km
      expect(calculatePaceDecay(8)).toBe(5);
      expect(effectivePace(basePace, 8)).toBe(305);
    });

    it("caso límite: tope de 60 s/km", () => {
      const basePace = 300;

      // Día 9: 10 s/km
      expect(calculatePaceDecay(9)).toBe(10);
      // Día 18: 55 s/km
      expect(calculatePaceDecay(18)).toBe(55);
      // Día 19: exactamente 60 s/km
      expect(calculatePaceDecay(19)).toBe(60);
      expect(effectivePace(basePace, 19)).toBe(360);

      // Día 20: tope en 60 s/km (no pasa a 65)
      expect(calculatePaceDecay(20)).toBe(60);
      expect(effectivePace(basePace, 20)).toBe(360);

      // Día 30: sigue en el tope de 60 s/km
      expect(calculatePaceDecay(30)).toBe(60);
      expect(effectivePace(basePace, 30)).toBe(360);
    });

    it("caso límite: empate con el tiempo debilitado (no roba)", () => {
      const owner: CellMark = {
        userId: "owner-1",
        paceS: 300,
        crossedAt: 10_000,
        uploadedAt: 10_100,
        daysInactive: 8, // Debilitado a 305 s/km
      };

      const rivalPace305: CellMark = {
        userId: "rival-2",
        paceS: 305, // Empate con el tiempo debilitado
        crossedAt: 20_000,
        uploadedAt: 20_100,
      };

      // En empate con el tiempo debilitado, el dueño defiende (superar exige ritmo estrictamente menor)
      expect(decideClaim(owner, rivalPace305)).toBe("defend");

      // Con ritmo más lento que el debilitado (306), defiende
      expect(decideClaim(owner, { ...rivalPace305, paceS: 306 })).toBe("defend");

      // Superando estrictamente el tiempo debilitado (304 < 305), roba
      expect(decideClaim(owner, { ...rivalPace305, paceS: 304 })).toBe("steal");
    });

    it("permite al dueño mantener o mejorar su marca en una baldosa debilitada", () => {
      const owner: CellMark = {
        userId: "runner-me",
        paceS: 300,
        crossedAt: 10_000,
        uploadedAt: 10_100,
        daysInactive: 10, // Debilitada a 315 s/km
      };

      // Si el dueño corre a 310 s/km (peor que su mejor marca de 300):
      // mantiene la baldosa ('keep') y renueva actividad
      expect(decideClaim(owner, { ...owner, paceS: 310 })).toBe("keep");

      // Si el dueño mejora su mejor marca histórica (295 < 300): mejora ('improve')
      expect(decideClaim(owner, { ...owner, paceS: 295 })).toBe("improve");
    });
  });

  describe("Regla 3: Tope de 20 puntos diarios por baldosas poseídas", () => {
    it("asigna 1 punto por baldosa hasta 20 baldosas", () => {
      expect(calculateDailyPoints(0)).toEqual({
        cellsOwned: 0,
        cellPoints: 0,
        bonusPoints: 0,
        totalPoints: 0,
      });

      expect(calculateDailyPoints(5)).toEqual({
        cellsOwned: 5,
        cellPoints: 5,
        bonusPoints: 0,
        totalPoints: 5,
      });

      expect(calculateDailyPoints(19)).toEqual({
        cellsOwned: 19,
        cellPoints: 19,
        bonusPoints: 0,
        totalPoints: 19,
      });
    });

    it("caso límite: exactamente 20 puntos de posesión", () => {
      const points = calculateDailyPoints(20);
      expect(points.cellPoints).toBe(20);
      expect(points.totalPoints).toBe(20);
    });

    it("limita a 20 puntos aunque se posean más de 20 baldosas", () => {
      expect(calculateDailyPoints(21).cellPoints).toBe(20);
      expect(calculateDailyPoints(30).cellPoints).toBe(20);
      expect(calculateDailyPoints(99).cellPoints).toBe(20);
    });

    it("mantiene aparte los bonus (+1 conquista y +2 robo) sin verse afectados por el tope", () => {
      // 25 baldosas (tope 20) + 3 conquistas (+3) + 2 robos (+4) = 27 puntos
      const result = calculateDailyPoints(25, 3, 2);
      expect(result.cellsOwned).toBe(25);
      expect(result.cellPoints).toBe(20);
      expect(result.bonusPoints).toBe(7); // 3*1 + 2*2
      expect(result.totalPoints).toBe(27);

      // Exactamente 20 baldosas (20) + 1 robo (+2) = 22 puntos
      const resultExact = calculateDailyPoints(20, 0, 1);
      expect(resultExact.cellPoints).toBe(20);
      expect(resultExact.bonusPoints).toBe(2);
      expect(resultExact.totalPoints).toBe(22);
    });
  });

  describe("Regla 4: Liberación de baldosas al ascender de liga", () => {
    const tiles: OwnedTile[] = [
      { h3: "8a43a136148ffff", leagueId: "starter", ownerId: "user-a" },
      { h3: "8a43a136149ffff", leagueId: "starter", ownerId: "user-a" },
      { h3: "8a43a13614affff", leagueId: "starter", ownerId: "user-b" },
      { h3: "8a43a13614bffff", leagueId: "intermediate", ownerId: "user-c" },
    ];

    it("libera las baldosas que el usuario tenía en su liga anterior al ascender", () => {
      // User A asciende de 'starter' a 'intermediate'
      const remaining = liberateTilesOnPromotion(tiles, "user-a", "intermediate");

      // Las baldosas de user-a en 'starter' fueron liberadas
      expect(remaining.filter((t) => t.ownerId === "user-a")).toHaveLength(0);

      // Las baldosas de otros corredores (user-b en starter, user-c en intermediate) no se tocan
      expect(remaining.filter((t) => t.ownerId === "user-b")).toHaveLength(1);
      expect(remaining.filter((t) => t.ownerId === "user-c")).toHaveLength(1);
      expect(remaining).toHaveLength(2);
    });
  });
});
