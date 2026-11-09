import type { Locale } from "./index";

export const STORAGE_KEY = "dubai_run_locale";

/**
 * Resolves the initial locale:
 * 1. Saved choice from localStorage if present ('es' or 'en').
 * 2. Device language (navigator.language).
 *    If starts with 'es', returns 'es'.
 *    Otherwise (including non-Spanish and non-English, e.g. 'fr', 'de', 'ar'), returns 'en'.
 */
export function resolveInitialLocale(
  savedLocale?: string | null,
  browserLanguage?: string | null,
): Locale {
  if (savedLocale === "es" || savedLocale === "en") {
    return savedLocale;
  }
  if (browserLanguage) {
    const clean = browserLanguage.toLowerCase().trim();
    if (clean.startsWith("es")) {
      return "es";
    }
    return "en";
  }
  return "en";
}
