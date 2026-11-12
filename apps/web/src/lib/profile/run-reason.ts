import type { ProfileRunStatus } from "./types";

export const KNOWN_REASON_CODES = [
  "NO_TIMESTAMPS",
  "NOT_RUNNING",
  "OUT_OF_WINDOW",
  "LOW_DENSITY",
  "GPS_SPIKES",
  "TOO_SHORT",
  "DUPLICATE",
  "COPIED_TRACK",
  "RATE_LIMIT",
  "IMPOSSIBLE_PACE",
  "BIKE_PATTERN",
  "CADENCE",
] as const;

export type KnownReasonCode = (typeof KNOWN_REASON_CODES)[number];
export type ProfileRejectReasonKey = KnownReasonCode | "unknown";
export type ProfileRunReasonVariant = "info" | "review" | "rejected";
export type ProfileRunReasonLabelKind = "note" | "reason";

export interface ProfileRunReasonInfo {
  variant: ProfileRunReasonVariant;
  labelKind: ProfileRunReasonLabelKind;
  reasonKey: ProfileRejectReasonKey;
}

const KNOWN_REASON_SET: ReadonlySet<string> = new Set(KNOWN_REASON_CODES);

/**
 * Resolves visual tone, label kind ("Note" vs "Reason"), and dictionary key
 * for a run's `rejectCode` according to its current status.
 */
export function resolveRunReasonInfo(
  status: ProfileRunStatus,
  rejectCode: string | null,
): ProfileRunReasonInfo | null {
  if (!rejectCode) return null;
  const trimmed = rejectCode.trim();
  if (!trimmed) return null;

  const reasonKey: ProfileRejectReasonKey = KNOWN_REASON_SET.has(trimmed)
    ? (trimmed as KnownReasonCode)
    : "unknown";

  if (status === "accepted") {
    return {
      variant: "info",
      labelKind: "note",
      reasonKey,
    };
  }

  if (status === "review") {
    return {
      variant: "review",
      labelKind: "reason",
      reasonKey,
    };
  }

  if (status === "pending" || status === "processing") {
    return {
      variant: "info",
      labelKind: "reason",
      reasonKey,
    };
  }

  return {
    variant: "rejected",
    labelKind: "reason",
    reasonKey,
  };
}
