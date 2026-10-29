/**
 * Who keeps a cell after one rounded mark (PRODUCTO §3.3–§3.6).
 * `apply_run` in SQL uses the same comparisons. Lower `paceS` is faster.
 * The pace is already an integer of seconds per kilometre.
 */
export type CellClaim = "conquest" | "steal" | "improve" | "defend" | "keep";

export type CellMark = {
  userId: string;
  paceS: number;
  /** When the runner crossed the cell. */
  crossedAt: number;
  /** When the run was uploaded. Breaks a tie on the same crossing second. */
  uploadedAt: number;
};

export function decideClaim(current: CellMark | null, incoming: CellMark): CellClaim {
  if (!current) return "conquest";
  const takes =
    incoming.paceS < current.paceS ||
    (incoming.paceS === current.paceS &&
      (incoming.crossedAt < current.crossedAt ||
        (incoming.crossedAt === current.crossedAt && incoming.uploadedAt < current.uploadedAt)));
  if (!takes) return incoming.userId === current.userId ? "keep" : "defend";
  return incoming.userId === current.userId ? "improve" : "steal";
}
