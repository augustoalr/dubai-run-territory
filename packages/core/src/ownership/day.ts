/**
 * Gulf game day (Asia/Dubai) closing at 03:59:00.
 * A time between 04:00:00 on day D and 03:59:00 on day D+1 belongs to day D.
 */
export const GULF_TIMEZONE = "Asia/Dubai";

export function gulfGameDay(dateOrMs: Date | number | string): string {
  const d =
    typeof dateOrMs === "number" || typeof dateOrMs === "string" ? new Date(dateOrMs) : dateOrMs;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: GULF_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  let year = "";
  let month = "";
  let day = "";
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") day = part.value;
    else if (part.type === "hour") hour = Number.parseInt(part.value, 10);
    else if (part.type === "minute") minute = Number.parseInt(part.value, 10);
  }
  // In 24h format, 00:00 - 03:59 belongs to the previous calendar day
  if (hour < 3 || (hour === 3 && minute <= 59)) {
    const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    utcDate.setUTCDate(utcDate.getUTCDate() - 1);
    const prevYear = utcDate.getUTCFullYear();
    const prevMonth = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
    const prevDay = String(utcDate.getUTCDate()).padStart(2, "0");
    return `${prevYear}-${prevMonth}-${prevDay}`;
  }
  return `${year}-${month}-${day}`;
}

export function diffGameDays(from: Date | number | string, to: Date | number | string): number {
  const dayFrom = gulfGameDay(from);
  const dayTo = gulfGameDay(to);
  const msFrom = Date.parse(`${dayFrom}T00:00:00Z`);
  const msTo = Date.parse(`${dayTo}T00:00:00Z`);
  return Math.round((msTo - msFrom) / (24 * 60 * 60 * 1000));
}
