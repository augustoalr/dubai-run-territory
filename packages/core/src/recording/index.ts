export {
  DEFAULT_FILTER_CONFIG,
  filterRecordedPoints,
  isValidRecordedPoint,
  MAX_RUNNING_SPEED_KMH,
  MAX_RUNNING_SPEED_MPS,
} from "./filter";
export { buildGpx } from "./gpx-builder";
export type { BuildGpxOptions } from "./gpx-builder";
export {
  calculateAveragePaceSecondsPerKm,
  calculateCurrentPaceSecondsPerKm,
  calculateCurrentSpeedKmh,
  calculateDistanceMeters,
  calculateDurationSeconds,
  computeRecordingStats,
  formatDisplayDistance,
  formatDisplayDuration,
  formatDisplayPace,
  formatDisplaySpeed,
} from "./metrics";
export type { LiveRecordingStats, PointFilterConfig, RecordedPoint } from "./types";
