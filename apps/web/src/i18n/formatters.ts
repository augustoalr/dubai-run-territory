import { formatPace } from "@dubai-run/core";
import type { Locale } from "./index";

/**
 * Formats distance into kilometres according to the locale.
 * Spanish uses comma decimal separator: "1,24 km"
 * English uses point decimal separator: "1.24 km"
 */
export function formatLocaleDistance(meters: number, locale: Locale): string {
  const km = meters / 1000;
  const numStr = km.toLocaleString(locale === "es" ? "es-ES" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${numStr} km`;
}

/**
 * Formats speed into km/h according to the locale.
 * Spanish uses comma: "10,5 km/h"
 * English uses point: "10.5 km/h"
 */
export function formatLocaleSpeed(speedKmh: number | null | undefined, locale: Locale): string {
  if (speedKmh == null || !Number.isFinite(speedKmh) || speedKmh <= 0) {
    return "--";
  }
  const numStr = speedKmh.toLocaleString(locale === "es" ? "es-ES" : "en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${numStr} km/h`;
}

/**
 * Formats pace into "M:SS /km" or "--".
 */
export function formatLocalePace(paceSecondsPerKm: number | null | undefined): string {
  if (paceSecondsPerKm == null || !Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm <= 0) {
    return "--";
  }
  return `${formatPace(paceSecondsPerKm)} /km`;
}

/**
 * Formats duration in seconds into "MM:SS" or "H:MM:SS".
 */
export function formatLocaleDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const paddedMinutes = minutes.toString().padStart(2, "0");
  const paddedSeconds = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Formats date according to the locale.
 */
export function formatLocaleDate(
  dateInput: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Fecha no disponible" : "Date unavailable";
  }

  const defaultOptions: Intl.DateTimeFormatOptions = options ?? {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return date.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", defaultOptions);
}
