/** Sample season: Monday 19 Oct 2026 00:00 through Sunday 8 Nov 2026 23:59, Gulf time (UTC+4). */
export const EXAMPLE_SEASON = {
  startsAt: "2026-10-18T20:00:00.000Z",
  endsAt: "2026-11-08T19:59:59.000Z",
};

export function seasonRangeLabel(locale: "es" | "en"): string {
  const format = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Dubai",
  });
  return `${format.format(new Date(EXAMPLE_SEASON.startsAt))} – ${format.format(new Date(EXAMPLE_SEASON.endsAt))}`;
}
