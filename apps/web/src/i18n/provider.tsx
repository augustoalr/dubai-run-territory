"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { resolveInitialLocale, STORAGE_KEY } from "./detect";
import { dictionary, es, type Dictionary, type Locale } from "./dictionaries";
import {
  formatLocaleDate,
  formatLocaleDistance,
  formatLocaleDuration,
  formatLocalePace,
  formatLocaleSpeed,
} from "./formatters";

export interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (nextLocale: Locale) => void;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDistance: (meters: number) => string;
  formatPace: (secondsPerKm: number | null | undefined) => string;
  formatSpeed: (speedKmh: number | null | undefined) => string;
  formatDuration: (seconds: number) => string;
}

const defaultDictionary = es;

const defaultContextValue: I18nContextValue = {
  locale: "es",
  t: defaultDictionary,
  setLocale: () => {},
  formatDate: (d, opts) => formatLocaleDate(d, "es", opts),
  formatDistance: (m) => formatLocaleDistance(m, "es"),
  formatPace: (p) => formatLocalePace(p),
  formatSpeed: (s) => formatLocaleSpeed(s, "es"),
  formatDuration: (sec) => formatLocaleDuration(sec),
};

const I18nContext = createContext<I18nContextValue>(defaultContextValue);

export interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    if (typeof window === "undefined") return "es";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const navLang = typeof navigator !== "undefined" ? navigator.language : null;
      return resolveInitialLocale(saved, navLang);
    } catch {
      return "es";
    }
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      // Ignore storage errors
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLocale;
    }
  }, []);

  const t = useMemo(() => dictionary(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t,
      setLocale,
      formatDate: (d, opts) => formatLocaleDate(d, locale, opts),
      formatDistance: (m) => formatLocaleDistance(m, locale),
      formatPace: (p) => formatLocalePace(p),
      formatSpeed: (s) => formatLocaleSpeed(s, locale),
      formatDuration: (sec) => formatLocaleDuration(sec),
    }),
    [locale, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
