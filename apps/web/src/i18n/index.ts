import { en, es, type Dictionary } from "./dictionaries";

export type Locale = "es" | "en";

const dictionaries: Record<Locale, Dictionary> = { es, en };

export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.es;
}

export { en, es, type Dictionary };
export { resolveInitialLocale, STORAGE_KEY } from "./detect";
export {
  formatLocaleDate,
  formatLocaleDistance,
  formatLocaleDuration,
  formatLocalePace,
  formatLocaleSpeed,
} from "./formatters";
export { I18nProvider, useI18n, type I18nContextValue } from "./provider";
