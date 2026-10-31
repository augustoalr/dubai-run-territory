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
  /** Number of days the owner has been inactive on this cell. */
  daysInactive?: number;
};

export const DECAY_GRACE_DAYS = 7;
export const DECAY_PACE_PER_DAY = 5;
export const MAX_DECAY_PACE = 60;
export const MAX_DAILY_CELL_POINTS = 20;

/**
 * Calculates pace worsening (decay) in s/km based on inactive days.
 * If owner hasn't run the cell in 7 days, it worsens by 5 s/km per day, up to 60 s/km.
 */
export function calculatePaceDecay(daysInactive: number): number {
  if (daysInactive <= DECAY_GRACE_DAYS) return 0;
  return Math.min(MAX_DECAY_PACE, (daysInactive - DECAY_GRACE_DAYS) * DECAY_PACE_PER_DAY);
}

/**
 * Weakened (effective) pace that a rival must beat to steal the cell.
 */
export function effectivePace(basePaceS: number, daysInactive: number): number {
  return basePaceS + calculatePaceDecay(daysInactive);
}

/**
 * Calculates daily points given cells owned and conquest/steal bonuses.
 * Capped at 20 daily points for owned cells; +1 conquest and +2 steal remain separate.
 */
export function calculateDailyPoints(
  cellsOwned: number,
  conquests: number = 0,
  steals: number = 0,
): {
  cellsOwned: number;
  cellPoints: number;
  bonusPoints: number;
  totalPoints: number;
} {
  const cellPoints = Math.min(MAX_DAILY_CELL_POINTS, Math.max(0, cellsOwned));
  const bonusPoints = Math.max(0, conquests) * 1 + Math.max(0, steals) * 2;
  return {
    cellsOwned,
    cellPoints,
    bonusPoints,
    totalPoints: cellPoints + bonusPoints,
  };
}

export type OwnedTile = {
  h3: string;
  leagueId: string;
  ownerId: string;
};

/**
 * Liberates tiles owned in previous leagues when a runner is promoted to a new league.
 */
export function liberateTilesOnPromotion(
  tiles: readonly OwnedTile[],
  promotedUserId: string,
  newLeagueId: string,
): OwnedTile[] {
  return tiles.filter(
    (tile) => !(tile.ownerId === promotedUserId && tile.leagueId !== newLeagueId),
  );
}

/**
 * Decides cell claim outcome taking into account owner debilitamiento (decay).
 */
export function decideClaim(current: CellMark | null, incoming: CellMark): CellClaim {
  if (!current) return "conquest";

  if (incoming.userId === current.userId) {
    return incoming.paceS < current.paceS ? "improve" : "keep";
  }

  const decay = calculatePaceDecay(current.daysInactive ?? 0);
  const targetPace = current.paceS + decay;

  // Rival must strictly beat the weakened pace (lower is faster).
  // In case of tie with decayed pace, owner defends (does NOT steal).
  // If no decay, standard tie-breaker applies (crossed first, then uploaded first).
  const takes =
    incoming.paceS < targetPace ||
    (incoming.paceS === targetPace &&
      decay === 0 &&
      (incoming.crossedAt < current.crossedAt ||
        (incoming.crossedAt === current.crossedAt && incoming.uploadedAt < current.uploadedAt)));

  return takes ? "steal" : "defend";
}
