export { DEFAULT_FILTER_CONFIG, filterRecordedPoints, isValidRecordedPoint } from "./filter";
export { buildGpx } from "./gpx-builder";
export type { BuildGpxOptions } from "./gpx-builder";
export {
  calculateAveragePaceSecondsPerKm,
  calculateCurrentPaceSecondsPerKm,
  calculateDistanceMeters,
  computeRecordingStats,
  formatDisplayDistance,
  formatDisplayDuration,
  formatDisplayPace,
} from "./metrics";
export type { LiveRecordingStats, PointFilterConfig, RecordedPoint } from "./types";
