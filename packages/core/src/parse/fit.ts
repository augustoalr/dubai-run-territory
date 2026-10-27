import { Decoder, Stream, Utils, type FitMessages, type RecordMesg } from "@garmin/fitsdk";
import { TrackParseError } from "./errors";
import { sportFromLabel } from "./sport";
import type { ParsedActivity, RawPoint, Sport } from "./types";

/** degrees = semicircles * 180 / 2^31. 2^31 is exact in JS. */
const SEMICIRCLES_PER_HALF_TURN = 2 ** 31;

/** FIT invalid sint32. It converts to ~180°, which is not a real fix. */
const INVALID_SINT32 = 0x7fffffff;

/**
 * Read a FIT activity with the official Garmin SDK (`Decoder`, `Stream`).
 * The import is the npm package `@garmin/fitsdk`, which Deno loads as `npm:@garmin/fitsdk`.
 * No DOM and no Node APIs, so the same module runs in the browser, Expo and the Edge Function.
 *
 * Position fields stay in semicircles in this SDK; this function converts them to degrees.
 * Running cadence is strides per minute in the FIT profile, so it is doubled to steps per minute.
 * Cycling cadence stays in crank revolutions per minute.
 * Throws `INVALID_FILE` when `isFIT` or `checkIntegrity` fails, and `NO_TIMESTAMPS`
 * when the file has no record with both a timestamp and a position.
 */
export function parseFit(bytes: Uint8Array): ParsedActivity {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new TrackParseError("INVALID_FILE", "FIT payload is empty");
  }

  const decoder = new Decoder(Stream.fromByteArray(bytes));
  if (!decoder.isFIT() || !decoder.checkIntegrity()) {
    throw new TrackParseError("INVALID_FILE", "FIT failed isFIT or checkIntegrity");
  }

  const { messages, errors } = decoder.read();
  if (errors.length > 0) {
    throw new TrackParseError("INVALID_FILE", "FIT decoder reported errors");
  }

  const sport = sportFromSessions(messages);
  const records = messages.recordMesgs ?? [];
  const points: RawPoint[] = [];
  let missingTime = false;

  for (const record of records) {
    if (!hasPosition(record)) continue;
    const t = epochMs(record.timestamp);
    if (t === undefined) {
      missingTime = true;
      continue;
    }
    const lat = semicirclesToDegrees(record.positionLat);
    const lon = semicirclesToDegrees(record.positionLong);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

    const sample: RawPoint = { t, lat, lon };
    const ele = elevation(record);
    if (ele !== undefined) sample.ele = ele;
    if (typeof record.heartRate === "number" && Number.isFinite(record.heartRate)) {
      sample.hr = record.heartRate;
    }
    const rpm = cadenceRpm(record);
    if (rpm !== undefined) sample.cad = sport === "cycling" ? rpm : rpm * 2;
    points.push(sample);
  }

  if (missingTime || points.length === 0) {
    throw new TrackParseError(
      "NO_TIMESTAMPS",
      "FIT has no record with both a timestamp and a position",
    );
  }

  const activity: ParsedActivity = { points };
  if (sport) activity.sport = sport;
  return activity;
}

export function semicirclesToDegrees(semicircles: number): number {
  return (semicircles * 180) / SEMICIRCLES_PER_HALF_TURN;
}

function sportFromSessions(messages: FitMessages): Sport | undefined {
  for (const session of messages.sessionMesgs ?? []) {
    const name = fitSportName(session.sport);
    if (name) return sportFromLabel(name);
  }
  return undefined;
}

function fitSportName(sport: unknown): string | undefined {
  if (typeof sport === "string" && sport.trim()) return sport;
  if (typeof sport === "number" && Number.isFinite(sport)) {
    if (sport === 1) return "running";
    if (sport === 2) return "cycling";
    if (sport === 21) return "eBiking";
    if (sport === 0) return "generic";
    return "other";
  }
  return undefined;
}

function hasPosition(
  record: RecordMesg,
): record is RecordMesg & { positionLat: number; positionLong: number } {
  return (
    typeof record.positionLat === "number" &&
    typeof record.positionLong === "number" &&
    Number.isFinite(record.positionLat) &&
    Number.isFinite(record.positionLong) &&
    record.positionLat !== INVALID_SINT32 &&
    record.positionLong !== INVALID_SINT32
  );
}

function epochMs(value: unknown): number | undefined {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1e12) return value;
    return value * 1000 + Utils.FIT_EPOCH_MS;
  }
  return undefined;
}

/** Metres. Rounded to 1 cm to undo binary residue from the FIT altitude scale. */
function elevation(record: RecordMesg): number | undefined {
  const raw = record.altitude ?? record.enhancedAltitude;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  return Math.round(raw * 100) / 100;
}

/**
 * Cadence in rpm before the running ×2.
 * `cadence256` is the full value. Otherwise whole strides plus the fractional field
 * (the SDK already applies the 1/128 scale).
 */
function cadenceRpm(record: RecordMesg): number | undefined {
  if (typeof record.cadence256 === "number" && Number.isFinite(record.cadence256)) {
    return record.cadence256;
  }
  if (typeof record.cadence !== "number" || !Number.isFinite(record.cadence)) return undefined;
  const fraction =
    typeof record.fractionalCadence === "number" && Number.isFinite(record.fractionalCadence)
      ? record.fractionalCadence
      : 0;
  return record.cadence + fraction;
}
