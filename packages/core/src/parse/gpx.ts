import { XMLParser } from "fast-xml-parser";
import { TrackParseError } from "./errors";
import { sportFromLabel } from "./sport";
import type { ParsedActivity, RawPoint, Sport } from "./types";

/**
 * Garmin TrackPointExtension stores running cadence as revolutions of one foot
 * (steps/min ÷ 2). Apple exports that reuse the same element often store steps/min
 * already (typically 140–190). Values at or below this line, on a running file,
 * are treated as Garmin half-steps.
 */
const GARMIN_HALF_CADENCE_MAX = 125;

const GPX_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const HR_KEYS = new Set(["hr", "heartrate", "hrbpm"]);
const CAD_KEYS = new Set(["cad", "cadence"]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: false,
  isArray: (tagName) => tagName === "trk" || tagName === "trkseg" || tagName === "trkpt",
});

/**
 * Read a GPX track into the shared point format.
 * Works in the browser and in Deno: `fast-xml-parser` only, no browser DOM.
 * Throws `NO_TIMESTAMPS` when a track point has no timezone-aware `<time>`.
 * A `<time>` in metadata is not a point timestamp.
 */
export function parseGpx(text: string): ParsedActivity {
  const source = text.replace(/^\uFEFF/, "").trim();
  if (!source) throw new TrackParseError("INVALID_FILE", "GPX is empty");

  let parsedXml: unknown;
  try {
    parsedXml = parser.parse(source);
  } catch {
    throw new TrackParseError("INVALID_FILE", "GPX is not valid XML");
  }

  const root = isRecord(parsedXml) ? parsedXml.gpx : undefined;
  if (!isRecord(root)) throw new TrackParseError("INVALID_FILE", "GPX root is missing");

  const points: RawPoint[] = [];
  let sport: Sport | undefined;
  let sawTrackPoint = false;
  let missingTime = false;

  for (const track of asArray(root.trk)) {
    if (!isRecord(track)) continue;
    if (!sport) {
      const label = textContent(track.type);
      if (label) sport = sportFromLabel(label);
    }
    for (const segment of asArray(track.trkseg)) {
      if (!isRecord(segment)) continue;
      for (const point of asArray(segment.trkpt)) {
        if (!isRecord(point)) continue;
        sawTrackPoint = true;
        const lat = readCoord(point.lat, 90);
        const lon = readCoord(point.lon, 180);
        if (lat === undefined || lon === undefined) {
          throw new TrackParseError("INVALID_FILE", "GPX track point is missing lat or lon");
        }
        const t = readTime(point.time);
        if (t === undefined) {
          missingTime = true;
          continue;
        }
        const vitals = readVitals(point.extensions);
        const sample: RawPoint = { t, lat, lon };
        const ele = finiteNumber(point.ele);
        if (ele !== undefined) sample.ele = ele;
        if (vitals.hr !== undefined) sample.hr = vitals.hr;
        if (vitals.cad !== undefined) sample.cad = normalizeGpxCadence(vitals.cad, sport);
        points.push(sample);
      }
    }
  }

  if (!sawTrackPoint) throw new TrackParseError("INVALID_FILE", "GPX has no track points");
  if (missingTime || points.length === 0) {
    throw new TrackParseError("NO_TIMESTAMPS", "GPX track point is missing <time>");
  }

  const activity: ParsedActivity = { points };
  if (sport) activity.sport = sport;
  return activity;
}

function normalizeGpxCadence(raw: number, sport: Sport | undefined): number {
  if (sport === "running" && raw <= GARMIN_HALF_CADENCE_MAX) return raw * 2;
  return raw;
}

function readTime(value: unknown): number | undefined {
  if (typeof value === "string") {
    if (!GPX_TIME.test(value)) return undefined;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : undefined;
  }
  const text = textContent(value);
  if (!text || !GPX_TIME.test(text)) return undefined;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : undefined;
}

function readCoord(value: unknown, limit: number): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && Math.abs(value) <= limit ? value : undefined;
  }
  if (typeof value === "string" && value.length > 0) {
    const coord = Number(value);
    return Number.isFinite(coord) && Math.abs(coord) <= limit ? coord : undefined;
  }
  return undefined;
}

function readVitals(extensions: unknown): { hr?: number; cad?: number } {
  if (extensions == null || !isRecord(extensions)) return {};
  const found: { hr?: number; cad?: number } = {};
  walkVitals(extensions, found, 0);
  return found;
}

function walkVitals(node: unknown, found: { hr?: number; cad?: number }, depth: number): void {
  if (!isRecord(node) || depth > 6) return;
  for (const [key, value] of Object.entries(node)) {
    const name = key.slice(key.lastIndexOf(":") + 1).toLowerCase();
    if (HR_KEYS.has(name) && found.hr === undefined) {
      const hr = finiteNumber(value);
      if (hr !== undefined) found.hr = hr;
      continue;
    }
    if (CAD_KEYS.has(name) && found.cad === undefined) {
      const cad = finiteNumber(value);
      if (cad !== undefined) found.cad = cad;
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) walkVitals(item, found, depth + 1);
    } else if (isRecord(value)) {
      walkVitals(value, found, depth + 1);
    }
  }
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (isRecord(value) && "#text" in value) return finiteNumber(value["#text"]);
  return undefined;
}

function textContent(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value) && "#text" in value) return textContent(value["#text"]);
  return undefined;
}

function asArray(value: unknown): unknown[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
