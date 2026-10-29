/**
 * Best mark on one H3 cell inside a single run.
 *
 * Contract between the pure engine (T-09, `computeCellEfforts`) and
 * `apply_run(run_id, efforts jsonb)` (T-12). The Edge Function passes the
 * array through as JSON. Keys stay camelCase, the same names as this type.
 * `run_id`, `user_id`, `zone_id`, `season_id` and `league_id` are not here:
 * they come from the `runs` row.
 *
 * Rules (PRODUCTO §3.2):
 * - `paceS` is seconds per kilometre, already rounded to 1 s/km. Lower is faster.
 * - The window is the continuous 1 km used to measure that pace, in metres
 *   along the segment. It is centred on the crossing when 500 m exist on both
 *   sides; otherwise it shifts inward. A segment shorter than 1 km produces
 *   no effort.
 * - One run keeps a single effort per cell: its best pace. An earlier
 *   `crossedAt` breaks a tie. `parseCellEfforts` rejects a duplicate `h3`.
 * - `crossedAt` is the interpolated crossing instant in UTC, produced by
 *   `Date.prototype.toISOString()` (`YYYY-MM-DDTHH:mm:ss.sssZ`).
 */
export type CellEffort = {
  /** H3 index, lowercase hex, resolution of the zone (10 for the MVP). */
  h3: string;
  /** UTC timestamp of the crossing (`toISOString`). */
  crossedAt: string;
  /** Rounded seconds per kilometre. */
  paceS: number;
  /** Start of the 1 km window, metres along the continuous segment. */
  windowStartM: number;
  /** End of the window. `windowEndM - windowStartM` is 1000. */
  windowEndM: number;
};

/** Metres of continuous running that define a cell mark. */
export const CELL_EFFORT_WINDOW_M = 1000;

/** JSON keys, in the order T-12 should read them. */
export const CELL_EFFORT_KEYS = ["h3", "crossedAt", "paceS", "windowStartM", "windowEndM"] as const;

const H3_INDEX = /^[0-9a-f]{15}$/;
const CROSSED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const WINDOW_TOLERANCE_M = 0.001;

export class CellEffortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CellEffortError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate one effort and return a copy that contains only the contract keys. */
export function parseCellEffort(value: unknown): CellEffort {
  if (!isRecord(value)) {
    throw new CellEffortError("effort must be an object");
  }
  const keys = Object.keys(value).sort();
  const expected = [...CELL_EFFORT_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new CellEffortError(`effort keys must be ${CELL_EFFORT_KEYS.join(", ")}`);
  }

  const h3 = value.h3;
  if (typeof h3 !== "string" || !H3_INDEX.test(h3)) {
    throw new CellEffortError("h3 must be a 15-character lowercase hex index");
  }

  const crossedAt = value.crossedAt;
  if (
    typeof crossedAt !== "string" ||
    !CROSSED_AT.test(crossedAt) ||
    !Number.isFinite(Date.parse(crossedAt))
  ) {
    throw new CellEffortError("crossedAt must be a UTC toISOString timestamp");
  }

  const paceS = value.paceS;
  if (typeof paceS !== "number" || !Number.isInteger(paceS) || paceS <= 0) {
    throw new CellEffortError("paceS must be a positive integer of seconds per kilometre");
  }

  const windowStartM = value.windowStartM;
  const windowEndM = value.windowEndM;
  if (typeof windowStartM !== "number" || !Number.isFinite(windowStartM) || windowStartM < 0) {
    throw new CellEffortError("windowStartM must be a finite number of metres >= 0");
  }
  if (typeof windowEndM !== "number" || !Number.isFinite(windowEndM)) {
    throw new CellEffortError("windowEndM must be a finite number of metres");
  }
  const span = windowEndM - windowStartM;
  if (Math.abs(span - CELL_EFFORT_WINDOW_M) > WINDOW_TOLERANCE_M) {
    throw new CellEffortError("the pace window must be 1000 metres");
  }

  return { h3, crossedAt, paceS, windowStartM, windowEndM };
}

/**
 * Validate the payload T-09 returns and T-12 stores.
 * Rejects a second effort for the same cell: the engine keeps only the best.
 */
export function parseCellEfforts(value: unknown): CellEffort[] {
  if (!Array.isArray(value)) {
    throw new CellEffortError("efforts must be an array");
  }
  const efforts = value.map((entry) => parseCellEffort(entry));
  const seen = new Set<string>();
  for (const effort of efforts) {
    if (seen.has(effort.h3)) {
      throw new CellEffortError(`duplicate cell ${effort.h3}`);
    }
    seen.add(effort.h3);
  }
  return efforts;
}
