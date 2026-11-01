export type RecordedPoint = {
  lat: number;
  lon: number;
  /** Unix epoch milliseconds. */
  time: number;
  /** Horizontal accuracy in metres from geolocation. */
  accuracy?: number;
  /** Elevation in metres. */
  ele?: number;
  /** Speed in metres per second, if provided by GPS. */
  speed?: number;
};

export type PointFilterConfig = {
  /** Maximum acceptable GPS accuracy in metres (points above this are discarded). Default: 30. */
  maxAccuracyMeters: number;
  /** Maximum plausible human running speed in m/s (jumps above this are discarded). Default: 25 km/h (~6.94 m/s). */
  maxSpeedMps: number;
};

export type LiveRecordingStats = {
  /** Elapsed duration in seconds. */
  durationSeconds: number;
  /** Total cumulative distance in metres. */
  distanceMeters: number;
  /** Recent pace in seconds per kilometre, or null if stationary / not enough data. */
  currentPaceSecondsPerKm: number | null;
  /** Recent speed in km/h, or null if stationary / not enough data. */
  currentSpeedKmh: number | null;
  /** Average pace in seconds per kilometre across the entire run. */
  averagePaceSecondsPerKm: number | null;
};
