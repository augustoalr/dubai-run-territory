/**
 * Gulf game day (Asia/Dubai) closing before 04:00:00 the following morning.
 * Game day D runs from 04:00:00 on day D until before 04:00:00 on day D+1.
 */
export const GULF_TIMEZONE = "Asia/Dubai";

export function gulfGameDay(dateOrMs: Date | number | string): string {
  const ms =
    typeof dateOrMs === "number"
      ? dateOrMs
      : typeof dateOrMs === "string"
        ? Date.parse(dateOrMs)
        : dateOrMs.getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid date: ${String(dateOrMs)}`);
  }
  // Subtracting 4 hours aligns the 04:00:00 cutoff with midnight in Asia/Dubai.
  const shifted = new Date(ms - 4 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: GULF_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(shifted);
}

export function diffGameDays(from: Date | number | string, to: Date | number | string): number {
  const dayFrom = gulfGameDay(from);
  const dayTo = gulfGameDay(to);
  const msFrom = Date.parse(`${dayFrom}T00:00:00Z`);
  const msTo = Date.parse(`${dayTo}T00:00:00Z`);
  return Math.round((msTo - msFrom) / (24 * 60 * 60 * 1000));
}
