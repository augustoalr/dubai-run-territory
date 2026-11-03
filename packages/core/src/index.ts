export { assessRun } from "./track/assess";
export type { Assessment } from "./track/assess";
export { checkRun, REASON } from "./track/check";
export type {
  CheckContext,
  CheckResult,
  KnownTrack,
  PriorRun,
  ReasonCode,
  RunFlag,
  RunMeta,
  RunStatus,
  SeasonWindow,
} from "./track/check";
export { computeCellEfforts } from "./track/compute";
export { DEFAULT_ANTI_CHEAT } from "./track/config";
export type { AntiCheatConfig } from "./track/config";
export { trackHash } from "./track/hash";
export { clipToZone, normalize, normalizeActivity } from "./track/normalize";
export type {
  NormalizeResult,
  NormalizedActivity,
  NormalizedPoint,
  SplitKind,
  TrackSegment,
} from "./track/normalize";
export { TrackParseError, isTrackParseError } from "./parse/errors";
export type { ParseErrorCode } from "./parse/errors";
export { parseFit } from "./parse/fit";
export { parseGpx } from "./parse/gpx";
export type { ParsedActivity, RawPoint, Sport } from "./parse/types";
export { bufferCenterline } from "./geo/buffer";
export {
  distanceToPolylineMeters,
  haversineMeters,
  pointInRing,
  polylineLengthMeters,
  ringAreaSquareMeters,
} from "./geo/measure";
export type { LineStringGeometry, LngLat, PolygonGeometry } from "./geo/types";
export {
  CELL_EFFORT_KEYS,
  CELL_EFFORT_WINDOW_M,
  CellEffortError,
  parseCellEffort,
  parseCellEfforts,
} from "./efforts/cell-effort";
export type { CellEffort } from "./efforts/cell-effort";
export { formatPace } from "./format/pace";
export { assignLeague } from "./leagues/assign";
export { LEAGUE_BANDS, LEAGUE_CODES } from "./leagues/bands";
export type { LeagueBand, LeagueCode } from "./leagues/bands";
export { REFERENCE_WINDOW_MS, referencePaceS } from "./leagues/reference";
export type { DatedPace } from "./leagues/reference";
export { resolveLeagueForRun } from "./leagues/resolve";
export type { LeagueDecision, LeagueReason } from "./leagues/resolve";
export { bestKmWindow } from "./leagues/window";
export {
  DECAY_GRACE_DAYS,
  DECAY_PACE_PER_DAY,
  MAX_DECAY_PACE,
  MAX_DAILY_CELL_POINTS,
  calculateDailyPoints,
  calculatePaceDecay,
  decideClaim,
  effectivePace,
  liberateTilesOnPromotion,
} from "./ownership/decide";
export type { CellClaim, CellMark, OwnedTile } from "./ownership/decide";
export { GULF_TIMEZONE, diffGameDays, gulfGameDay } from "./ownership/day";
export { planRun } from "./runs/process";
export type { RunPlan } from "./runs/process";
export { ACTIVITY_PROVIDERS, RUN_SOURCES } from "./runs/source";
export type { ActivityProvider, RunSource } from "./runs/source";
export {
  TRACK_H3_RESOLUTION,
  cellCenter,
  cellPolygon,
  cellsForPolygon,
  cellsForZone,
} from "./zones/cells";
export { readZoneGeometry } from "./zones/parse";
export {
  DEFAULT_FILTER_CONFIG,
  MAX_RUNNING_SPEED_KMH,
  MAX_RUNNING_SPEED_MPS,
  buildGpx,
  calculateAveragePaceSecondsPerKm,
  calculateCurrentPaceSecondsPerKm,
  calculateCurrentSpeedKmh,
  calculateDistanceMeters,
  calculateDurationSeconds,
  computeRecordingStats,
  filterRecordedPoints,
  formatDisplayDistance,
  formatDisplayDuration,
  formatDisplayPace,
  formatDisplaySpeed,
  isValidRecordedPoint,
} from "./recording";
export type {
  BuildGpxOptions,
  LiveRecordingStats,
  PointFilterConfig,
  RecordedPoint,
} from "./recording";
export { ZONE_CATALOG, activeZones, getZone, jumeirahKiteZone } from "./zones/registry";
export type { LocalizedName, ZoneDefinition, ZoneStatus } from "./zones/types";
