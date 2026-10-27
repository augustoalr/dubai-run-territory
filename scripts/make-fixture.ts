import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Encoder, Profile } from "@garmin/fitsdk";
import { latLngToCell } from "h3-js";
import { haversineMeters, polylineLengthMeters } from "../packages/core/src/geo/measure.ts";
import type { LngLat } from "../packages/core/src/geo/types.ts";
import { TRACK_H3_RESOLUTION, cellsForZone } from "../packages/core/src/zones/cells.ts";
import { jumeirahKiteZone } from "../packages/core/src/zones/registry.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "fixtures");

const START_MS = Date.UTC(2026, 9, 19, 2, 30, 0);
const FUTURE_MS = Date.UTC(2027, 5, 1, 2, 30, 0);

type Dialect = "garmin" | "strava" | "apple";
type Sport = "running" | "cycling";
type League = "elite" | "advanced" | "intermediate" | "starter";
type Kind = "steady" | "pause" | "teleport" | "spike" | "short";
type Status = "accepted" | "review" | "rejected";

type Sample = {
  lat: number;
  lon: number;
  tMs: number;
  ele: number;
  hr: number;
  cadRaw: number;
  distanceM: number;
  semiLat: number;
  semiLon: number;
};

type Expectation = {
  id: string;
  file: string;
  format: "gpx" | "fit";
  source: "garmin-connect" | "strava" | "apple-watch" | "garmin-fit";
  sport: Sport | null;
  league: League | null;
  status: Status;
  reason: string | null;
  approxCells: number;
  cellsTouched: number;
  scoringCells: number;
  distanceM: number;
  paceSPerKm: number | null;
  speedKmh: number | null;
  pointCount: number;
  startedAt: string;
  segmentCount: number;
  duplicateOf: string | null;
  sameTrackAs: string | null;
  offTrackPoints: number;
  throws: "NO_TIMESTAMPS" | null;
  first: { lat: number; lon: number; tMs: number; cad: number; hr: number } | null;
  notes: string;
};

type Spec = {
  id: string;
  format: "gpx" | "fit";
  dialect: Dialect;
  sport: Sport;
  league: League | null;
  status: Status;
  reason: string | null;
  distanceM: number;
  paceSPerKm: number | null;
  speedKmh: number | null;
  kind: Kind;
  startMs: number;
  includeTime: boolean;
  throws: "NO_TIMESTAMPS" | null;
  segmentCount: number;
  notes: string;
};

const line = jumeirahKiteZone.centerline?.coordinates;
if (!line || line.length < 2) throw new Error("Jumeirah · Kite centerline is missing");
const lineLength = polylineLengthMeters(line);
if (lineLength < 5600) throw new Error(`centerline is ${lineLength} m, need at least 5600 m`);

const zoneCells = new Set(cellsForZone(jumeirahKiteZone));

const specs: Spec[] = [
  {
    id: "run-elite-4min",
    format: "gpx",
    dialect: "garmin",
    sport: "running",
    league: "elite",
    status: "accepted",
    reason: null,
    distanceM: 5000,
    paceSPerKm: 240,
    speedKmh: null,
    kind: "steady",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "Carrera de la liga Élite a 4:00/km y 5 km sobre el eje de Jumeirah · Kite. GPX como lo exporta Garmin Connect: la cadencia va en revoluciones de un pie.",
  },
  {
    id: "run-advanced-5min",
    format: "gpx",
    dialect: "strava",
    sport: "running",
    league: "advanced",
    status: "accepted",
    reason: null,
    distanceM: 5000,
    paceSPerKm: 300,
    speedKmh: null,
    kind: "steady",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "Carrera de la liga Avanzado a 5:00/km y 5 km. GPX como lo exporta Strava (extensiones Garmin de pulso y cadencia). Es la carrera válida de T-05.",
  },
  {
    id: "run-intermediate-5min45",
    format: "gpx",
    dialect: "apple",
    sport: "running",
    league: "intermediate",
    status: "accepted",
    reason: null,
    distanceM: 5000,
    paceSPerKm: 345,
    speedKmh: null,
    kind: "steady",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "Carrera de la liga Intermedio a 5:45/km y 5 km. GPX de HealthFit, el export habitual de un Apple Watch: la cadencia ya viene en pasos por minuto.",
  },
  {
    id: "run-starter-6min30",
    format: "gpx",
    dialect: "garmin",
    sport: "running",
    league: "starter",
    status: "accepted",
    reason: null,
    distanceM: 5000,
    paceSPerKm: 390,
    speedKmh: null,
    kind: "steady",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "Carrera de la liga Inicial a 6:30/km y 5 km. GPX de Garmin Connect. Es la carrera válida lenta de T-05.",
  },
  {
    id: "bike-30kmh",
    format: "gpx",
    dialect: "strava",
    sport: "cycling",
    league: null,
    status: "rejected",
    reason: "NOT_RUNNING",
    distanceM: 5000,
    paceSPerKm: null,
    speedKmh: 30,
    kind: "steady",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "Vuelta en bici a 30 km/h por el mismo eje. GPX de Strava con <type>cycling</type>. El antitrampas la rechaza: no es carrera.",
  },
  {
    id: "teleport-500m",
    format: "gpx",
    dialect: "garmin",
    sport: "running",
    league: "advanced",
    status: "accepted",
    reason: null,
    distanceM: 5000,
    paceSPerKm: 300,
    speedKmh: null,
    kind: "teleport",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 2,
    notes:
      "A 2,5 km el siguiente punto está a 500 m en línea recta (1 s después) y la carrera sigue otros 2,5 km, a 5:00/km. Por la curva de la costa, el hueco a lo largo del eje es mayor que 500 m. T-08 tiene que partirla en 2 tramos. Un filtro que borre todo lo que supere 12 m/s se comería el segundo tramo: el salto también es un pico.",
  },
  {
    id: "pause-2min",
    format: "gpx",
    dialect: "garmin",
    sport: "running",
    league: "advanced",
    status: "accepted",
    reason: null,
    distanceM: 5000,
    paceSPerKm: 300,
    speedKmh: null,
    kind: "pause",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 2,
    notes:
      "Pausa de 2 min a mitad de una carrera de 5 km a 5:00/km. El reloj no se mueve; solo se abre un hueco de tiempo. T-08 tiene que partirla en 2 tramos.",
  },
  {
    id: "gps-spike",
    format: "gpx",
    dialect: "strava",
    sport: "running",
    league: "advanced",
    status: "accepted",
    reason: null,
    distanceM: 5000,
    paceSPerKm: 300,
    speedKmh: null,
    kind: "spike",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "Un solo punto se desplaza al este y el siguiente vuelve al eje. El tramo pasa de 12 m/s y se queda por debajo de 100 m: es un pico de GPS, no un teletransporte. T-08 debe descartar ese punto. Sigue junto a la playa: no es una casa.",
  },
  {
    id: "future-date",
    format: "gpx",
    dialect: "garmin",
    sport: "running",
    league: "advanced",
    status: "rejected",
    reason: "OUT_OF_WINDOW",
    distanceM: 5000,
    paceSPerKm: 300,
    speedKmh: null,
    kind: "steady",
    startMs: FUTURE_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "La misma carrera a 5:00/km con inicio el 1 jun 2027. El parser la lee. El antitrampas la rechaza por fecha futura (OUT_OF_WINDOW). La ventana de 72 h y la temporada activa llegan con T-10, cuando existan las temporadas.",
  },
  {
    id: "short-under-1km",
    format: "gpx",
    dialect: "apple",
    sport: "running",
    league: "advanced",
    status: "accepted",
    reason: "TOO_SHORT",
    distanceM: 800,
    paceSPerKm: 300,
    speedKmh: null,
    kind: "short",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "800 m a 5:00/km dentro de la zona. Se acepta y no puntúa celdas (TOO_SHORT): el tramo continuo no llega al kilómetro de la ventana.",
  },
  {
    id: "no-timestamps",
    format: "gpx",
    dialect: "strava",
    sport: "running",
    league: "advanced",
    status: "rejected",
    reason: "NO_TIMESTAMPS",
    distanceM: 5000,
    paceSPerKm: 300,
    speedKmh: null,
    kind: "steady",
    startMs: START_MS,
    includeTime: false,
    throws: "NO_TIMESTAMPS",
    segmentCount: 1,
    notes:
      "Mismo recorrido que la carrera de 5:00/km, pero los trkpt no llevan <time>. El <time> de metadata no cuenta. El parser lanza NO_TIMESTAMPS.",
  },
  {
    id: "run-advanced",
    format: "fit",
    dialect: "garmin",
    sport: "running",
    league: "advanced",
    status: "accepted",
    reason: null,
    distanceM: 5000,
    paceSPerKm: 300,
    speedKmh: null,
    kind: "steady",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "FIT sintético con el SDK oficial de Garmin, misma carrera a 5:00/km. session.sport es running. La cadencia se guarda en zancadas (un pie) y el parser la pasa a pasos por minuto. No es un archivo de un reloj real.",
  },
  {
    id: "bike-cycling",
    format: "fit",
    dialect: "garmin",
    sport: "cycling",
    league: null,
    status: "rejected",
    reason: "NOT_RUNNING",
    distanceM: 5000,
    paceSPerKm: null,
    speedKmh: 30,
    kind: "steady",
    startMs: START_MS,
    includeTime: true,
    throws: null,
    segmentCount: 1,
    notes:
      "FIT sintético de ciclismo a 30 km/h. session.sport es cycling. La cadencia queda en revoluciones del pedal, sin duplicar. El antitrampas lo rechaza (NOT_RUNNING).",
  },
];

mkdirSync(outDir, { recursive: true });
rmSync(join(outDir, ".gitkeep"), { force: true });

const written = new Map<string, { text?: string; expectation: Expectation }>();

for (const spec of specs) {
  const samples = buildSamples(line, spec);
  const expectation = expectationFor(spec, samples);
  if (spec.format === "gpx") {
    const text = renderGpx(spec, samples);
    writeFileSync(join(outDir, `${spec.id}.gpx`), text);
    written.set(spec.id, { text, expectation });
  } else {
    writeFileSync(join(outDir, `${spec.id}.fit`), encodeFit(samples, spec.sport));
    written.set(spec.id, { expectation });
  }
  writeFileSync(join(outDir, `${spec.id}.json`), `${JSON.stringify(expectation, null, 2)}\n`);
  console.log(
    `${spec.id}: ${expectation.pointCount} pts, touched ${expectation.cellsTouched}, scoring ${expectation.scoringCells}, ${expectation.status}${expectation.reason ? `/${expectation.reason}` : ""}`,
  );
}

const advanced = written.get("run-advanced-5min");
if (!advanced?.text) throw new Error("missing advanced GPX");

writeFileSync(join(outDir, "duplicate-advanced.gpx"), advanced.text);
const duplicate = derivedExpectation(advanced.expectation, {
  id: "duplicate-advanced",
  file: "duplicate-advanced.gpx",
  status: "rejected",
  reason: "DUPLICATE",
  approxCells: 0,
  duplicateOf: "run-advanced-5min",
  sameTrackAs: "run-advanced-5min",
  notes:
    "Los mismos bytes que run-advanced-5min.gpx. El SHA-256 del archivo coincide, así que es un duplicado propio (DUPLICATE). No añade datos personales.",
});
writeFileSync(join(outDir, "duplicate-advanced.json"), `${JSON.stringify(duplicate, null, 2)}\n`);

const copiedText = advanced.text
  .replace('creator="StravaGPX"', 'creator="OtherExport"')
  .replace("<name>Morning Run</name>", "<name>Copied activity</name>");
if (copiedText === advanced.text) throw new Error("copied track did not change the file");
writeFileSync(join(outDir, "copied-track.gpx"), copiedText);
const copied = derivedExpectation(advanced.expectation, {
  id: "copied-track",
  file: "copied-track.gpx",
  status: "review",
  reason: "COPIED_TRACK",
  approxCells: 0,
  duplicateOf: null,
  sameTrackAs: "run-advanced-5min",
  notes:
    "Los mismos trkpt que la carrera avanzada, con otro creator y otro nombre. El SHA-256 del archivo cambia y el recorrido no: es la copia de otro usuario (COPIED_TRACK, a revisión).",
});
writeFileSync(join(outDir, "copied-track.json"), `${JSON.stringify(copied, null, 2)}\n`);

console.log(`centerline ${Math.round(lineLength)} m, zone cells ${zoneCells.size}`);
console.log("wrote fixtures to fixtures/");

function buildSamples(track: readonly LngLat[], spec: Spec): Sample[] {
  const speed = spec.speedKmh != null ? spec.speedKmh / 3.6 : 1000 / (spec.paceSPerKm ?? 300);
  const jumpM = spec.kind === "teleport" ? alongTrackJump(track, 2500, 500) : 500;
  const marks = marksFor(spec.distanceM, speed, spec.kind, jumpM);
  const samples = marks.map((mark, index) => {
    const at = pointAlong(track, mark.distanceM);
    const fit = quantizeFit(at[1], at[0]);
    const lat = spec.format === "fit" ? fit.lat : Number(at[1].toFixed(7));
    const lon = spec.format === "fit" ? fit.lon : Number(at[0].toFixed(7));
    return {
      lat,
      lon,
      tMs: spec.startMs + mark.tOffsetS * 1000,
      ele: Number((4 + Math.sin(index / 40) * 0.4).toFixed(1)),
      hr: wave(index, spec.sport === "cycling" ? 138 : 152, 3),
      cadRaw: rawCadence(index, spec),
      distanceM: Math.round(mark.distanceM * 100) / 100,
      semiLat: fit.semiLat,
      semiLon: fit.semiLon,
    };
  });
  if (spec.kind === "spike") {
    const index = Math.floor(samples.length / 2);
    const sample = samples[index];
    if (!sample) throw new Error("spike sample missing");
    sample.lon = Number((sample.lon + 0.0007).toFixed(7));
    const moved = quantizeFit(sample.lat, sample.lon);
    sample.semiLat = moved.semiLat;
    sample.semiLon = moved.semiLon;
  }
  return samples;
}

function marksFor(
  distanceM: number,
  speed: number,
  kind: Kind,
  jumpM: number,
): { distanceM: number; tOffsetS: number }[] {
  if (kind === "pause") {
    const half = distanceM / 2;
    const halfSteps = Math.round(half / speed);
    const marks: { distanceM: number; tOffsetS: number }[] = [];
    for (let second = 0; second <= halfSteps; second += 1) {
      marks.push({ distanceM: second === halfSteps ? half : second * speed, tOffsetS: second });
    }
    const resume = halfSteps + 120;
    marks.push({ distanceM: half, tOffsetS: resume });
    const rest = Math.round((distanceM - half) / speed);
    for (let second = 1; second <= rest; second += 1) {
      marks.push({
        distanceM: second === rest ? distanceM : half + second * speed,
        tOffsetS: resume + second,
      });
    }
    return marks;
  }
  if (kind === "teleport") {
    const first = 2500;
    const jump = jumpM;
    const second = 2500;
    const steps1 = Math.round(first / speed);
    const marks: { distanceM: number; tOffsetS: number }[] = [];
    for (let secondN = 0; secondN <= steps1; secondN += 1) {
      marks.push({ distanceM: secondN === steps1 ? first : secondN * speed, tOffsetS: secondN });
    }
    const steps2 = Math.round(second / speed);
    for (let secondN = 0; secondN <= steps2; secondN += 1) {
      const base = first + jump;
      marks.push({
        distanceM: secondN === steps2 ? base + second : base + secondN * speed,
        tOffsetS: steps1 + 1 + secondN,
      });
    }
    return marks;
  }
  const steps = Math.round(distanceM / speed);
  const marks: { distanceM: number; tOffsetS: number }[] = [];
  for (let second = 0; second <= steps; second += 1) {
    marks.push({
      distanceM: second === steps ? distanceM : Math.min(distanceM, second * speed),
      tOffsetS: second,
    });
  }
  return marks;
}

function expectationFor(spec: Spec, samples: Sample[]): Expectation {
  const spikeIndex = spec.kind === "spike" ? Math.floor(samples.length / 2) : -1;
  const scoringSamples =
    spikeIndex >= 0 ? samples.filter((_, index) => index !== spikeIndex) : samples;
  const cellsTouched = countCells(samples);
  const scoringCells = spec.kind === "short" ? 0 : countCells(scoringSamples);
  const first = samples[0];
  if (!first) throw new Error(`${spec.id} has no samples`);
  return {
    id: spec.id,
    file: `${spec.id}.${spec.format}`,
    format: spec.format,
    source: sourceOf(spec),
    sport: spec.sport,
    league: spec.league,
    status: spec.status,
    reason: spec.reason,
    approxCells: spec.status === "accepted" ? scoringCells : 0,
    cellsTouched,
    scoringCells,
    distanceM: spec.distanceM,
    paceSPerKm: spec.paceSPerKm,
    speedKmh: spec.speedKmh,
    pointCount: samples.length,
    startedAt: new Date(spec.startMs).toISOString(),
    segmentCount: spec.segmentCount,
    duplicateOf: null,
    sameTrackAs: null,
    offTrackPoints: spec.kind === "spike" ? 1 : 0,
    throws: spec.throws,
    first: spec.throws
      ? null
      : {
          lat: first.lat,
          lon: first.lon,
          tMs: first.tMs,
          cad: parsedCadence(first.cadRaw, spec),
          hr: first.hr,
        },
    notes: spec.notes,
  };
}

function derivedExpectation(
  base: Expectation,
  patch: Pick<
    Expectation,
    "id" | "file" | "status" | "reason" | "approxCells" | "duplicateOf" | "sameTrackAs" | "notes"
  >,
): Expectation {
  return { ...base, ...patch };
}

function sourceOf(spec: Spec): Expectation["source"] {
  if (spec.format === "fit") return "garmin-fit";
  if (spec.dialect === "strava") return "strava";
  if (spec.dialect === "apple") return "apple-watch";
  return "garmin-connect";
}

function rawCadence(index: number, spec: Spec): number {
  if (spec.sport === "cycling") return wave(index, 88, 1);
  if (spec.dialect === "apple") return wave(index, 170, 2);
  return wave(index, 85, 1);
}

function parsedCadence(raw: number, spec: Spec): number {
  if (spec.sport === "running" && spec.dialect !== "apple" && raw <= 125) return raw * 2;
  return raw;
}

function wave(index: number, base: number, amplitude: number): number {
  return Math.round(base + Math.sin(index / 20) * amplitude);
}

function countCells(samples: readonly { lat: number; lon: number }[]): number {
  const seen = new Set<string>();
  for (const sample of samples) {
    const cell = latLngToCell(sample.lat, sample.lon, TRACK_H3_RESOLUTION);
    if (zoneCells.has(cell)) seen.add(cell);
  }
  return seen.size;
}

/** Along-track gap whose straight-line length is at least `chordM`. */
function alongTrackJump(track: readonly LngLat[], fromM: number, chordM: number): number {
  const origin = pointAlong(track, fromM);
  for (let jump = chordM; jump <= 1800; jump += 5) {
    const chord = haversineMeters(origin, pointAlong(track, fromM + jump));
    if (chord >= chordM && chord <= chordM + 20) return jump;
  }
  throw new Error(`no ${chordM} m chord from ${fromM} m along the track`);
}

function pointAlong(track: readonly LngLat[], distanceM: number): LngLat {
  const first = track[0];
  if (!first) throw new Error("empty line");
  if (distanceM <= 0) return first;
  let remaining = distanceM;
  for (let i = 1; i < track.length; i += 1) {
    const start = track[i - 1];
    const end = track[i];
    if (!start || !end) continue;
    const length = haversineMeters(start, end);
    if (length === 0) continue;
    if (remaining <= length || i === track.length - 1) {
      const t = Math.min(1, remaining / length);
      return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
    }
    remaining -= length;
  }
  const last = track[track.length - 1];
  if (!last) throw new Error("empty line");
  return last;
}

function quantizeFit(
  lat: number,
  lon: number,
): { lat: number; lon: number; semiLat: number; semiLon: number } {
  const semiLat = Math.round((lat * 2 ** 31) / 180);
  const semiLon = Math.round((lon * 2 ** 31) / 180);
  return {
    semiLat,
    semiLon,
    lat: (semiLat * 180) / 2 ** 31,
    lon: (semiLon * 180) / 2 ** 31,
  };
}

function renderGpx(spec: Spec, samples: Sample[]): string {
  const startedAt = formatTime(spec.startMs, spec.dialect);
  const name = trackName(spec);
  const type = spec.dialect === "apple" ? "Running" : spec.sport;
  const points = samples
    .map((sample) => pointXml(sample, spec.dialect, spec.includeTime))
    .join("\n");
  return `${openGpx(spec.dialect, name, type, startedAt)}\n${points}\n${closeGpx(spec.dialect)}`;
}

function trackName(spec: Spec): string {
  if (spec.sport === "cycling") return "Beach Ride";
  if (spec.dialect === "strava") return "Morning Run";
  if (spec.dialect === "apple") return "Outdoor Run";
  return "Jumeirah Run";
}

function formatTime(ms: number, dialect: Dialect): string {
  const iso = new Date(ms).toISOString();
  return dialect === "strava" ? iso.replace(".000Z", "Z") : iso;
}

function pointXml(sample: Sample, dialect: Dialect, includeTime: boolean): string {
  const pad = dialect === "strava" ? "   " : "      ";
  const inner = dialect === "strava" ? "    " : "        ";
  const ext = dialect === "strava" ? "     " : "          ";
  const time = includeTime ? `\n${inner}<time>${formatTime(sample.tMs, dialect)}</time>` : "";
  return [
    `${pad}<trkpt lat="${sample.lat.toFixed(7)}" lon="${sample.lon.toFixed(7)}">`,
    `${inner}<ele>${sample.ele.toFixed(1)}</ele>${time}`,
    `${inner}<extensions>`,
    `${ext}<gpxtpx:TrackPointExtension>`,
    `${ext} <gpxtpx:hr>${sample.hr}</gpxtpx:hr>`,
    `${ext} <gpxtpx:cad>${sample.cadRaw}</gpxtpx:cad>`,
    `${ext}</gpxtpx:TrackPointExtension>`,
    `${inner}</extensions>`,
    `${pad}</trkpt>`,
  ].join("\n");
}

function openGpx(dialect: Dialect, name: string, type: string, startedAt: string): string {
  if (dialect === "strava") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">
 <metadata>
  <time>${startedAt}</time>
 </metadata>
 <trk>
  <name>${name}</name>
  <type>${type}</type>
  <trkseg>`;
  }
  if (dialect === "apple") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HealthFit" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <name>${name}</name>
    <time>${startedAt}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <type>${type}</type>
    <trkseg>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Garmin Connect" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">
  <metadata>
    <link href="https://connect.garmin.com">
      <text>Garmin Connect</text>
    </link>
    <time>${startedAt}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <type>${type}</type>
    <trkseg>`;
}

function closeGpx(dialect: Dialect): string {
  if (dialect === "strava") {
    return `  </trkseg>
 </trk>
</gpx>
`;
  }
  return `    </trkseg>
  </trk>
</gpx>
`;
}

function mesgNum(name: string): number {
  const value = Profile.MesgNum[name];
  if (value === undefined) throw new Error(`unknown FIT message ${name}`);
  return value;
}

/** The SDK types `mesgNum` as a literal union. A runtime number needs a cast. */
function write(encoder: Encoder, mesg: object): void {
  encoder.writeMesg(mesg as Parameters<Encoder["writeMesg"]>[0]);
}

function encodeFit(samples: Sample[], sport: Sport): Uint8Array {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) throw new Error("FIT sample list is empty");
  const start = new Date(first.tMs);
  const end = new Date(last.tMs);
  const elapsed = (last.tMs - first.tMs) / 1000;
  const encoder = new Encoder();
  write(encoder, {
    mesgNum: mesgNum("FILE_ID"),
    type: "activity",
    manufacturer: "development",
    product: 0,
    timeCreated: start,
    serialNumber: 1,
  });
  write(encoder, {
    mesgNum: mesgNum("DEVICE_INFO"),
    deviceIndex: "creator",
    manufacturer: "development",
    product: 0,
    productName: "Territorio fixture",
    serialNumber: 1,
    timestamp: start,
  });
  write(encoder, {
    mesgNum: mesgNum("EVENT"),
    timestamp: start,
    event: "timer",
    eventType: "start",
  });
  for (const sample of samples) {
    write(encoder, {
      mesgNum: mesgNum("RECORD"),
      timestamp: new Date(sample.tMs),
      positionLat: sample.semiLat,
      positionLong: sample.semiLon,
      altitude: sample.ele,
      heartRate: sample.hr,
      cadence: sample.cadRaw,
      distance: sample.distanceM,
    });
  }
  write(encoder, {
    mesgNum: mesgNum("EVENT"),
    timestamp: end,
    event: "timer",
    eventType: "stop",
  });
  write(encoder, {
    mesgNum: mesgNum("LAP"),
    messageIndex: 0,
    timestamp: end,
    startTime: start,
    totalElapsedTime: elapsed,
    totalTimerTime: elapsed,
    totalDistance: last.distanceM,
  });
  write(encoder, {
    mesgNum: mesgNum("SESSION"),
    messageIndex: 0,
    timestamp: end,
    startTime: start,
    totalElapsedTime: elapsed,
    totalTimerTime: elapsed,
    sport,
    subSport: "generic",
    firstLapIndex: 0,
    numLaps: 1,
    totalDistance: last.distanceM,
  });
  write(encoder, {
    mesgNum: mesgNum("ACTIVITY"),
    timestamp: end,
    numSessions: 1,
    totalTimerTime: elapsed,
    type: "manual",
  });
  return encoder.close();
}
