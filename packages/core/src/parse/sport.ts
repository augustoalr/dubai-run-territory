import type { Sport } from "./types";

/**
 * Map a free-text activity type from GPX `<type>` or a FIT sport name.
 * Cycling is checked first so labels like "e-bike" do not fall through to running.
 */
export function sportFromLabel(label: string): Sport {
  const name = label
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "");
  if (
    name.includes("ebike") ||
    name.includes("e-bike") ||
    name.includes("cycl") ||
    name.includes("bik") ||
    name.includes("ride")
  ) {
    return "cycling";
  }
  if (name.includes("run")) return "running";
  return "other";
}
