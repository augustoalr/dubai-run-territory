"use client";

import {
  buildGpx,
  calculateAveragePaceSecondsPerKm,
  calculateCurrentPaceSecondsPerKm,
  calculateDurationSeconds,
  haversineMeters,
  isValidRecordedPoint,
  type RecordedPoint,
} from "@dubai-run/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { geolocationService } from "./geolocation";
import { localRunStorage, type StoredRun } from "./indexeddb-storage";
import { wakeLockService } from "./wake-lock";

export type RecorderStatus = "idle" | "acquiring" | "recording" | "finished" | "error";

export type RecorderState = {
  status: RecorderStatus;
  durationSeconds: number;
  distanceMeters: number;
  currentPaceSecondsPerKm: number | null;
  gpsAccuracy: number | null;
  pointsCount: number;
  error: string | null;
  lastSavedRun: StoredRun | null;
};

export function useRunnerRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPaceSecondsPerKm, setCurrentPaceSecondsPerKm] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [points, setPoints] = useState<RecordedPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedRun, setLastSavedRun] = useState<StoredRun | null>(null);

  const pointsRef = useRef<RecordedPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);

  // Keep refs in sync for callbacks
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    durationRef.current = durationSeconds;
  }, [durationSeconds]);

  useEffect(() => {
    distanceRef.current = distanceMeters;
  }, [distanceMeters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        geolocationService.clearWatch(watchIdRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      void wakeLockService.release();
    };
  }, []);

  // Listen to visibility changes to keep wake lock alive while recording
  useEffect(() => {
    if (status !== "recording" && status !== "acquiring") return;

    const handleVisibility = () => {
      void wakeLockService.handleVisibilityChange();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [status]);

  const startRecording = useCallback(async () => {
    setError(null);
    setDurationSeconds(0);
    setDistanceMeters(0);
    setCurrentPaceSecondsPerKm(null);
    setGpsAccuracy(null);
    setPoints([]);
    setLastSavedRun(null);
    pointsRef.current = [];
    durationRef.current = 0;
    distanceRef.current = 0;
    startTimeRef.current = null;

    if (!geolocationService.isSupported()) {
      setError("Tu navegador no soporta geolocalización.");
      setStatus("error");
      return;
    }

    // Acquire Wake Lock
    await wakeLockService.acquire();

    setStatus("acquiring");

    const id = geolocationService.watchPosition(
      (position) => {
        const coords = position.coords;
        const candidate: RecordedPoint = {
          lat: coords.latitude,
          lon: coords.longitude,
          time: position.timestamp || Date.now(),
          accuracy: coords.accuracy,
          ele: coords.altitude ?? undefined,
          speed: coords.speed ?? undefined,
        };

        setGpsAccuracy(Math.round(coords.accuracy));

        const lastPoint = pointsRef.current[pointsRef.current.length - 1];

        // Discard poor accuracy (> 30 m) and impossible jumps
        if (!isValidRecordedPoint(candidate, lastPoint)) {
          return;
        }

        // Fix race start timestamp on the first valid GPS point
        if (startTimeRef.current === null) {
          const raceStartMs = candidate.time || Date.now();
          startTimeRef.current = raceStartMs;
          setStatus("recording");

          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            if (startTimeRef.current !== null) {
              const elapsed = calculateDurationSeconds(startTimeRef.current, Date.now());
              durationRef.current = elapsed;
              setDurationSeconds(elapsed);
            }
          }, 1000);
        }

        // Add valid point
        const nextPoints = [...pointsRef.current, candidate];
        pointsRef.current = nextPoints;
        setPoints(nextPoints);

        // Update elapsed time using wall-clock time
        if (startTimeRef.current !== null) {
          const elapsed = calculateDurationSeconds(startTimeRef.current, Date.now());
          durationRef.current = elapsed;
          setDurationSeconds(elapsed);
        }

        // Update distance
        if (lastPoint) {
          const addedDistance = haversineMeters(
            [lastPoint.lon, lastPoint.lat],
            [candidate.lon, candidate.lat],
          );
          setDistanceMeters((prev) => {
            const nextDist = prev + addedDistance;
            distanceRef.current = nextDist;
            return nextDist;
          });
        }

        // Update current pace
        const pace = calculateCurrentPaceSecondsPerKm(nextPoints);
        setCurrentPaceSecondsPerKm(pace);
      },
      (geoError) => {
        const message = geolocationService.getErrorMessage(geoError);
        // Only trigger fatal error if we don't have any points yet and permission denied
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(message);
          setStatus("error");
          if (timerRef.current) clearInterval(timerRef.current);
          if (watchIdRef.current !== null) geolocationService.clearWatch(watchIdRef.current);
          void wakeLockService.release();
        }
      },
    );

    watchIdRef.current = id;
  }, []);

  const finishRecording = useCallback(async () => {
    if (watchIdRef.current !== null) {
      geolocationService.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await wakeLockService.release();

    const endTime = Date.now();
    const startTime = startTimeRef.current || endTime;
    const finalPoints = pointsRef.current;
    const finalDuration = calculateDurationSeconds(startTime, endTime);
    durationRef.current = finalDuration;
    const finalDistance = distanceRef.current;

    const avgPace = calculateAveragePaceSecondsPerKm(finalDistance, finalDuration);
    const gpxString = buildGpx(finalPoints, {
      startTime,
      name: "Carrera Dubái",
    });

    const nowIso = new Date().toISOString();
    const runId = `run_${startTime}_${Math.random().toString(36).slice(2, 7)}`;
    const storedRun: StoredRun = {
      id: runId,
      name: `Carrera ${new Date(startTime).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(endTime).toISOString(),
      durationSeconds: finalDuration,
      distanceMeters: finalDistance,
      avgPaceSecondsPerKm: avgPace,
      pointsCount: finalPoints.length,
      gpx: gpxString,
      createdAt: nowIso,
    };

    try {
      await localRunStorage.saveRun(storedRun);
    } catch {
      // In case IndexedDB fails, we still show the summary to the user
    }

    setLastSavedRun(storedRun);
    setStatus("finished");
  }, []);

  const resetRecording = useCallback(() => {
    setStatus("idle");
    setDurationSeconds(0);
    setDistanceMeters(0);
    setCurrentPaceSecondsPerKm(null);
    setGpsAccuracy(null);
    setPoints([]);
    setError(null);
    setLastSavedRun(null);
  }, []);

  return {
    status,
    durationSeconds,
    distanceMeters,
    currentPaceSecondsPerKm,
    gpsAccuracy,
    pointsCount: points.length,
    error,
    lastSavedRun,
    startRecording,
    finishRecording,
    resetRecording,
  };
}
