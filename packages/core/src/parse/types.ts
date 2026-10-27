/**
 * Sport values the anti-cheat table understands (ARQUITECTURA §6).
 * `other` means the file named a sport that is neither running nor cycling.
 * When the file does not name a sport, the field is omitted.
 */
export type Sport = "running" | "cycling" | "other";

/**
 * One sample, shared by GPX, FIT and (later) a live recording.
 * The shape matches the internal point in ARQUITECTURA §9: `[t, lat, lon, cad?, hr?]`.
 */
export type RawPoint = {
  /** Unix epoch milliseconds. */
  t: number;
  lat: number;
  lon: number;
  /** Elevation in metres, when the file has it. */
  ele?: number;
  /**
   * Running: steps per minute.
   * Cycling: crank revolutions per minute.
   * Omitted when the file has no cadence.
   */
  cad?: number;
  /** Heart rate in beats per minute. */
  hr?: number;
};

/** Parsed file. Sport lives on the activity because FIT stores it on the session. */
export type ParsedActivity = {
  points: RawPoint[];
  sport?: Sport;
};
