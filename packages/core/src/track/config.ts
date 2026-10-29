/**
 * Thresholds from ARQUITECTURA §6 (PROPUESTA).
 * Pass a partial object to change one without editing the checks.
 */
export type AntiCheatConfig = {
  /** A step faster than this, and no longer than `teleportM`, is a GPS spike. */
  maxSpeedMps: number;
  /** A longer step is a teleport: split the segment and keep both sides. */
  teleportM: number;
  /** A longer pause splits the segment. */
  gapMs: number;
  /** Reject when the mean gap inside the zone is slower than one point per this many ms. */
  maxMeanIntervalMs: number;
  /** Reject when dropped spikes are more than this fraction of the timed points. */
  maxSpikeFraction: number;
  /** A 1 km window faster than this (s/km) goes to review. 2:40/km = 160. */
  impossiblePaceS: number;
  bikeMedianSpeedMps: number;
  /** The speed rule only fires when the pace barely changes. */
  maxBikeSpeedCv: number;
  bikeCadenceSpm: number;
  bikeCadenceSpeedMps: number;
  cadenceMinSpm: number;
  cadenceMaxSpm: number;
  cadenceFastSpeedMps: number;
  /** Continuous metres inside the zone required to score cells. */
  minContinuousM: number;
  uploadWindowMs: number;
  maxRunsPerDay: number;
  zoneBufferM: number;
};

export const DEFAULT_ANTI_CHEAT: AntiCheatConfig = {
  maxSpeedMps: 12,
  teleportM: 100,
  gapMs: 30_000,
  maxMeanIntervalMs: 10_000,
  maxSpikeFraction: 0.05,
  impossiblePaceS: 160,
  bikeMedianSpeedMps: 5.5,
  maxBikeSpeedCv: 0.15,
  bikeCadenceSpm: 120,
  bikeCadenceSpeedMps: 4,
  cadenceMinSpm: 140,
  cadenceMaxSpm: 220,
  cadenceFastSpeedMps: 4,
  minContinuousM: 1_000,
  uploadWindowMs: 72 * 60 * 60 * 1000,
  maxRunsPerDay: 3,
  zoneBufferM: 30,
};

export function resolveConfig(override?: Partial<AntiCheatConfig>): AntiCheatConfig {
  return { ...DEFAULT_ANTI_CHEAT, ...override };
}
