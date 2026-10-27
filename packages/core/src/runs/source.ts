/**
 * Where a run comes from. Stored as the Postgres enum `run_source`.
 *
 * - `upload`: the runner picks a `.gpx` or `.fit` file. A GPX exported from
 *   Strava is still an upload. The Strava API is not a source in phase 0.
 * - `garmin` / `polar`: imported with a `provider_connections` row. The
 *   activity id is `runs.external_activity_id`, unique per source.
 * - `browser`: reserved for a future in-browser recording. Not phase 0.
 *
 * The client may only insert `upload`. Garmin, Polar and browser rows are
 * written by the server.
 */
export const RUN_SOURCES = ["upload", "garmin", "polar", "browser"] as const;

export type RunSource = (typeof RUN_SOURCES)[number];

/**
 * Providers that store tokens in `provider_connections`.
 * Strava is intentionally absent in phase 0.
 */
export const ACTIVITY_PROVIDERS = ["garmin", "polar"] as const;

export type ActivityProvider = (typeof ACTIVITY_PROVIDERS)[number];
