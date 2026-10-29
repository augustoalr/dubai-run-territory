import type { NormalizedActivity } from "./normalize";

const LAT_LON_DIGITS = 10_000;
const TIME_BUCKET_MS = 5_000;

/**
 * Identity of a track for the copy check (ARQUITECTURA §6).
 * Points are rounded to about 10 m and 5 s, then hashed with SHA-256.
 * Web Crypto, so the same function runs in Node, the browser and Deno.
 */
export async function trackHash(activity: NormalizedActivity): Promise<string> {
  const lines: string[] = [];
  for (const segment of activity.segments) {
    for (const point of segment.points) {
      const lat = Math.round(point.lat * LAT_LON_DIGITS);
      const lon = Math.round(point.lon * LAT_LON_DIGITS);
      const time = Math.round(point.t / TIME_BUCKET_MS);
      lines.push(`${lat},${lon},${time}`);
    }
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(lines.join("\n")));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
