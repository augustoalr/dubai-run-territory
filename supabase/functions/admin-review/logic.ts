export const ADMIN_ACTIONS = [
  "approve_run",
  "void_run",
  "dismiss_report",
  "resolve_report",
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export interface ParsedAdminActionBody {
  action: AdminAction;
  targetId: string;
  reason: string;
}

export interface SeasonWindowRow {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
}

export interface ApprovalWindowInput {
  season: SeasonWindowRow | null;
  startedAtMs: number | null;
  endedAtMs: number | null;
  runCreatedAt: string;
}

export type ApprovalWindowResult =
  { ok: true } | { ok: false; code: "no_active_season" | "missing_timestamps" | "out_of_window" };

export const UPLOAD_WINDOW_MS = 72 * 60 * 60 * 1000;
export const MIN_REASON_LENGTH = 3;
export const MAX_REASON_LENGTH = 500;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_ACTION_SET: ReadonlySet<string> = new Set(ADMIN_ACTIONS);

/**
 * Validates and normalizes the JSON payload of POST /admin-review.
 */
export function parseAdminActionBody(
  raw: unknown,
): { ok: true; value: ParsedAdminActionBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_body" };
  }

  const record = raw as Record<string, unknown>;
  const action = record.action;
  if (typeof action !== "string" || !ADMIN_ACTION_SET.has(action)) {
    return { ok: false, error: "invalid_action" };
  }

  const targetId = typeof record.targetId === "string" ? record.targetId.trim() : "";
  if (!UUID_REGEX.test(targetId)) {
    return { ok: false, error: "invalid_target_id" };
  }

  const reason = typeof record.reason === "string" ? record.reason.trim() : "";
  if (reason.length < MIN_REASON_LENGTH || reason.length > MAX_REASON_LENGTH) {
    return { ok: false, error: "invalid_reason" };
  }

  return {
    ok: true,
    value: {
      action: action as AdminAction,
      targetId,
      reason,
    },
  };
}

/**
 * Defensively normalizes runs.flags whether stored as { flags: [...] }, [...], or {}.
 */
export function normalizeRunFlags(rawFlags: unknown): string[] {
  let candidateList: unknown[] = [];

  if (Array.isArray(rawFlags)) {
    candidateList = rawFlags;
  } else if (rawFlags && typeof rawFlags === "object") {
    const nested = (rawFlags as { flags?: unknown }).flags;
    if (Array.isArray(nested)) {
      candidateList = nested;
    }
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of candidateList) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

/**
 * Collects unique non-empty non-null IDs for safe `.in("id", ids)` batching.
 */
export function collectUniqueIds(ids: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/**
 * Validates that a run in review satisfies the active season and 72-hour upload window
 * rules enforced by apply_run and recompute_season before mutating runs.status.
 */
export function validateApprovalWindow(input: ApprovalWindowInput): ApprovalWindowResult {
  if (!input.season || input.season.status !== "active") {
    return { ok: false, code: "no_active_season" };
  }

  if (
    input.startedAtMs === null ||
    input.endedAtMs === null ||
    !Number.isFinite(input.startedAtMs) ||
    !Number.isFinite(input.endedAtMs)
  ) {
    return { ok: false, code: "missing_timestamps" };
  }

  const seasonStartsMs = Date.parse(input.season.starts_at);
  const seasonEndsMs = Date.parse(input.season.ends_at);
  const createdAtMs = Date.parse(input.runCreatedAt);

  if (
    !Number.isFinite(seasonStartsMs) ||
    !Number.isFinite(seasonEndsMs) ||
    !Number.isFinite(createdAtMs)
  ) {
    return { ok: false, code: "out_of_window" };
  }

  if (input.endedAtMs < input.startedAtMs) {
    return { ok: false, code: "out_of_window" };
  }

  if (input.startedAtMs < seasonStartsMs || input.startedAtMs > seasonEndsMs) {
    return { ok: false, code: "out_of_window" };
  }

  if (createdAtMs > seasonEndsMs + UPLOAD_WINDOW_MS) {
    return { ok: false, code: "out_of_window" };
  }

  if (createdAtMs > input.endedAtMs + UPLOAD_WINDOW_MS) {
    return { ok: false, code: "out_of_window" };
  }

  return { ok: true };
}

/**
 * Normalizes sport to match the runs.sport CHECK constraint ('running' | 'cycling' | 'other' | null).
 */
export function normalizeRunSport(
  parsedSport: string | undefined,
  existingSport: string | null,
): "running" | "cycling" | "other" | null {
  if (parsedSport === "running" || parsedSport === "cycling" || parsedSport === "other") {
    return parsedSport;
  }
  if (existingSport === "running" || existingSport === "cycling" || existingSport === "other") {
    return existingSport;
  }
  return null;
}

/**
 * Downsamples [lon, lat] coordinates for lightweight queue previews while preserving start and end.
 */
export function subsampleCoordinates(
  coordinates: readonly [number, number][],
  maxPoints = 300,
): [number, number][] {
  const valid: [number, number][] = [];
  for (const coord of coordinates) {
    if (!Array.isArray(coord) || coord.length < 2) continue;
    const [lon, lat] = coord;
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      valid.push([lon, lat]);
    }
  }

  if (maxPoints < 2 || valid.length <= maxPoints) {
    return valid;
  }

  const sampled: [number, number][] = [];
  const lastIndex = valid.length - 1;
  const step = lastIndex / (maxPoints - 1);

  for (let i = 0; i < maxPoints - 1; i += 1) {
    const idx = Math.round(i * step);
    const point = valid[idx];
    if (point) sampled.push(point);
  }
  const last = valid[lastIndex];
  if (last) sampled.push(last);

  return sampled;
}

/**
 * Strips the bucket prefix from runs.storage_path before calling Supabase Storage download().
 */
export function parseStorageObjectPath(storagePath: string): string {
  return storagePath.replace(/^runs-raw\//, "");
}
