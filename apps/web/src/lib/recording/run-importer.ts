import {
  buildGpx,
  calculateAveragePaceSecondsPerKm,
  calculateDistanceMeters,
  calculateDurationSeconds,
  parseFit,
  parseGpx,
  type RecordedPoint,
} from "@dubai-run/core";
import { localRunStorage, type StoredRun } from "./indexeddb-storage";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function importWatchFile(file: File): Promise<StoredRun> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("El archivo supera el tamaño máximo permitido de 10 MB.");
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (extension !== ".gpx" && extension !== ".fit") {
    throw new Error("Solo se admiten archivos .gpx o .fit de reloj.");
  }

  let points: Array<{ lat: number; lon: number; t: number; ele?: number }> = [];
  let gpxContent = "";

  try {
    if (extension === ".gpx") {
      const text = await file.text();
      const parsed = parseGpx(text);
      points = parsed.points;
      gpxContent = text;
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const parsed = parseFit(bytes);
      points = parsed.points;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("NO_TIMESTAMPS")) {
      throw new Error("El archivo no tiene marcas de tiempo válidas.");
    }
    throw new Error("El archivo está dañado o no es un formato válido de reloj.");
  }

  if (!points || points.length < 2) {
    throw new Error("El archivo no contiene suficientes puntos de GPS.");
  }

  const recordedPoints: RecordedPoint[] = points.map((p) => ({
    lat: p.lat,
    lon: p.lon,
    time: p.t,
    ele: p.ele,
  }));

  const startTime = points[0]!.t;
  const endTime = points[points.length - 1]!.t;
  const durationSeconds = calculateDurationSeconds(startTime, endTime);
  const distanceMeters = calculateDistanceMeters(recordedPoints);
  const avgPaceSecondsPerKm = calculateAveragePaceSecondsPerKm(distanceMeters, durationSeconds);

  const cleanName = file.name.replace(/\.[^.]+$/, "");

  // If imported from FIT, convert to GPX for local storage
  if (!gpxContent) {
    gpxContent = buildGpx(recordedPoints, {
      startTime,
      name: cleanName,
    });
  }

  const nowIso = new Date().toISOString();
  const runId = `imported_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const storedRun: StoredRun = {
    id: runId,
    name: cleanName,
    startedAt: new Date(startTime).toISOString(),
    endedAt: new Date(endTime).toISOString(),
    durationSeconds,
    distanceMeters,
    avgPaceSecondsPerKm,
    pointsCount: recordedPoints.length,
    gpx: gpxContent,
    createdAt: nowIso,
  };

  await localRunStorage.saveRun(storedRun);
  return storedRun;
}
