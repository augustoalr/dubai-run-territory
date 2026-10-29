/** PRODUCTO §3.7: the reference pace looks at the last 60 days only. */
export const REFERENCE_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export type DatedPace = {
  /** When the run started, unix milliseconds. */
  at: number;
  /** Best 1 km of that run, seconds per kilometre. Lower is faster. */
  paceS: number;
};

/**
 * Fastest 1 km among runs that started inside the last 60 days.
 * A run exactly 60 days old still counts. A future run does not.
 * Null when nothing in the window has a pace.
 */
export function referencePaceS(
  runs: readonly DatedPace[],
  now: number,
  windowMs = REFERENCE_WINDOW_MS,
): number | null {
  const oldest = now - windowMs;
  let best: number | null = null;
  for (const run of runs) {
    if (run.at < oldest || run.at > now) continue;
    if (!Number.isFinite(run.paceS) || run.paceS <= 0) continue;
    const paceS = Math.round(run.paceS);
    if (paceS <= 0) continue;
    if (best === null || paceS < best) best = paceS;
  }
  return best;
}
