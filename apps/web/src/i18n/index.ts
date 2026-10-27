import { en, es, type Dictionary } from "./dictionaries";

export type Locale = "es" | "en";

const dictionaries: Record<Locale, Dictionary> = { es, en };

export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
