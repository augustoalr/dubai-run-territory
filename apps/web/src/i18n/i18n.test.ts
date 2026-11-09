import { describe, expect, it } from "vitest";
import { en, es } from "./dictionaries";
import { resolveInitialLocale } from "./detect";
import {
  formatLocaleDate,
  formatLocaleDistance,
  formatLocaleDuration,
  formatLocalePace,
  formatLocaleSpeed,
} from "./formatters";

/**
 * Recursively collects all key paths from an object.
 * e.g. { a: { b: 1 }, c: "hello" } -> ["a.b", "c"]
 */
function collectKeyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    keys.push(fullPath);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...collectKeyPaths(value as Record<string, unknown>, fullPath));
    }
  }
  return keys.sort();
}

/**
 * Retrieves a value from an object given a dot-delimited path.
 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = obj;
  for (const seg of segments) {
    if (current && typeof current === "object" && seg in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

describe("i18n dictionaries key completeness and symmetry", () => {
  it("every key present in Spanish (es) exists in English (en)", () => {
    const esPaths = collectKeyPaths(es as unknown as Record<string, unknown>);
    const missingInEn: string[] = [];

    for (const path of esPaths) {
      const enVal = getByPath(en as unknown as Record<string, unknown>, path);
      if (enVal === undefined) {
        missingInEn.push(path);
      }
    }

    expect(missingInEn).toEqual([]);
  });

  it("every key present in English (en) exists in Spanish (es)", () => {
    const enPaths = collectKeyPaths(en as unknown as Record<string, unknown>);
    const missingInEs: string[] = [];

    for (const path of enPaths) {
      const esVal = getByPath(es as unknown as Record<string, unknown>, path);
      if (esVal === undefined) {
        missingInEs.push(path);
      }
    }

    expect(missingInEs).toEqual([]);
  });

  it("key types and functions match exactly between es and en", () => {
    const esPaths = collectKeyPaths(es as unknown as Record<string, unknown>);

    for (const path of esPaths) {
      const esVal = getByPath(es as unknown as Record<string, unknown>, path);
      const enVal = getByPath(en as unknown as Record<string, unknown>, path);

      expect(typeof enVal, `Mismatch for key ${path}`).toBe(typeof esVal);

      if (typeof esVal === "function" && typeof enVal === "function") {
        expect(enVal.length, `Function argument length mismatch for key ${path}`).toBe(
          esVal.length,
        );
      }
    }
  });

  it("run detail displays 'Sin recorrido GPS' in Spanish and 'No GPS track' in English", () => {
    expect(es.noGpsTrack).toBe("Sin recorrido GPS");
    expect(en.noGpsTrack).toBe("No GPS track");
    expect(es.startPointBadge).toBe("PUNTO DE INICIO");
    expect(en.startPointBadge).toBe("START POINT");
    expect(es.shortRunNotice).toBe("Carrera de pocos metros");
    expect(en.shortRunNotice).toBe("Run of a few metres");
  });
});

describe("resolveInitialLocale", () => {
  it("prefers valid stored choice in localStorage", () => {
    expect(resolveInitialLocale("es", "en-US")).toBe("es");
    expect(resolveInitialLocale("en", "es-ES")).toBe("en");
  });

  it("defaults to Spanish when browser language starts with 'es'", () => {
    expect(resolveInitialLocale(null, "es")).toBe("es");
    expect(resolveInitialLocale(null, "es-ES")).toBe("es");
    expect(resolveInitialLocale(null, "es-419")).toBe("es");
    expect(resolveInitialLocale(null, "es-MX")).toBe("es");
  });

  it("defaults to English when browser language is English", () => {
    expect(resolveInitialLocale(null, "en")).toBe("en");
    expect(resolveInitialLocale(null, "en-US")).toBe("en");
    expect(resolveInitialLocale(null, "en-GB")).toBe("en");
  });

  it("defaults to English when browser language is neither Spanish nor English", () => {
    expect(resolveInitialLocale(null, "fr-FR")).toBe("en");
    expect(resolveInitialLocale(null, "de-DE")).toBe("en");
    expect(resolveInitialLocale(null, "ar-AE")).toBe("en");
    expect(resolveInitialLocale(null, "ja")).toBe("en");
    expect(resolveInitialLocale(null, "")).toBe("en");
    expect(resolveInitialLocale(null, null)).toBe("en");
  });
});

describe("locale formatters", () => {
  it("formats distances with localized decimal separators", () => {
    const distEs = formatLocaleDistance(1240, "es");
    const distEn = formatLocaleDistance(1240, "en");

    expect(distEs).toBe("1,24 km");
    expect(distEn).toBe("1.24 km");
  });

  it("formats speeds with localized decimal separators", () => {
    const speedEs = formatLocaleSpeed(10.5, "es");
    const speedEn = formatLocaleSpeed(10.5, "en");

    expect(speedEs).toBe("10,5 km/h");
    expect(speedEn).toBe("10.5 km/h");
    expect(formatLocaleSpeed(null, "es")).toBe("--");
  });

  it("formats paces consistently", () => {
    expect(formatLocalePace(312)).toBe("5:12 /km");
    expect(formatLocalePace(null)).toBe("--");
  });

  it("formats durations into MM:SS or H:MM:SS", () => {
    expect(formatLocaleDuration(65)).toBe("01:05");
    expect(formatLocaleDuration(3665)).toBe("1:01:05");
  });

  it("formats dates with locale awareness", () => {
    const fixedDate = new Date("2026-11-03T12:00:00Z");
    const dateEs = formatLocaleDate(fixedDate, "es");
    const dateEn = formatLocaleDate(fixedDate, "en");

    expect(typeof dateEs).toBe("string");
    expect(typeof dateEn).toBe("string");
    expect(dateEs).not.toBe("");
    expect(dateEn).not.toBe("");
  });
});
