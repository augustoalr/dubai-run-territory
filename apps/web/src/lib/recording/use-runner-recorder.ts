"use client";

import {
  buildGpx,
  calculateAveragePaceSecondsPerKm,
  calculateCurrentPaceSecondsPerKm,
  calculateCurrentSpeedKmh,
  calculateDistanceMeters,
  calculateDurationSeconds,
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
  currentSpeedKmh: number | null;
  gpsAccuracy: number | null;
  pointsCount: number;
  error: string | null;
  lastSavedRun: StoredRun | null;
  acquiringTimeoutReached: boolean;
};

export function useRunnerRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPaceSecondsPerKm, setCurrentPaceSecondsPerKm] = useState<number | null>(null);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [points, setPoints] = useState<RecordedPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedRun, setLastSavedRun] = useState<StoredRun | null>(null);
  const [acquiringTimeoutReached, setAcquiringTimeoutReached] = useState(false);

  const pointsRef = useRef<RecordedPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const acquiringTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);
  const latestRawCandidateRef = useRef<RecordedPoint | null>(null);
  const allowAnyAccuracyRef = useRef<boolean>(false);

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
      if (acquiringTimerRef.current) {
        clearTimeout(acquiringTimerRef.current);
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
    setCurrentSpeedKmh(null);
    setGpsAccuracy(null);
    setPoints([]);
    setLastSavedRun(null);
    setAcquiringTimeoutReached(false);
    pointsRef.current = [];
    durationRef.current = 0;
    distanceRef.current = 0;
    startTimeRef.current = null;
    latestRawCandidateRef.current = null;
    allowAnyAccuracyRef.current = false;

    if (!geolocationService.isSupported()) {
      setError("Tu navegador no soporta geolocalización.");
      setStatus("error");
      return;
    }

    // Acquire Wake Lock
    await wakeLockService.acquire();

    setStatus("acquiring");

    // Start 60-second timer to offer "Empezar igual" or "Cancelar" if GPS fix takes too long
    if (acquiringTimerRef.current) {
      clearTimeout(acquiringTimerRef.current);
    }
    acquiringTimerRef.current = setTimeout(() => {
      setAcquiringTimeoutReached(true);
    }, 60_000);

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

        latestRawCandidateRef.current = candidate;
        setGpsAccuracy(Math.round(coords.accuracy));

        const lastPoint = pointsRef.current[pointsRef.current.length - 1];

        // Discard poor accuracy (> 30 m) unless user explicitly chose "Empezar igual",
        // and always discard impossible jumps (> 25 km/h)
        const filterConfig = allowAnyAccuracyRef.current ? { maxAccuracyMeters: 500 } : undefined;
        if (!isValidRecordedPoint(candidate, lastPoint, filterConfig)) {
          return;
        }

        // Fix race start timestamp on the first valid GPS point
        if (startTimeRef.current === null) {
          if (acquiringTimerRef.current) {
            clearTimeout(acquiringTimerRef.current);
            acquiringTimerRef.current = null;
          }
          setAcquiringTimeoutReached(false);

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

        // Update distance using smoothed calculation (ignoring movements < accuracy)
        const totalDistance = calculateDistanceMeters(nextPoints);
        setDistanceMeters(totalDistance);
        distanceRef.current = totalDistance;

        // Update rolling pace and speed (15-20 s moving average, '--' if stationary)
        const pace = calculateCurrentPaceSecondsPerKm(nextPoints);
        setCurrentPaceSecondsPerKm(pace);

        const speed = calculateCurrentSpeedKmh(nextPoints);
        setCurrentSpeedKmh(speed);
      },
      (geoError) => {
        const message = geolocationService.getErrorMessage(geoError);
        // Only trigger fatal error if we don't have any points yet and permission denied
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(message);
          setStatus("error");
          if (timerRef.current) clearInterval(timerRef.current);
          if (acquiringTimerRef.current) clearTimeout(acquiringTimerRef.current);
          if (watchIdRef.current !== null) geolocationService.clearWatch(watchIdRef.current);
          void wakeLockService.release();
        }
      },
    );

    watchIdRef.current = id;
  }, []);

  const startAnyway = useCallback(() => {
    if (acquiringTimerRef.current) {
      clearTimeout(acquiringTimerRef.current);
      acquiringTimerRef.current = null;
    }
    setAcquiringTimeoutReached(false);
    allowAnyAccuracyRef.current = true;

    const raceStartMs = Date.now();
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

    // If an initial candidate arrived (even if accuracy > 30 m), seed the track with it
    if (latestRawCandidateRef.current && pointsRef.current.length === 0) {
      const initial = { ...latestRawCandidateRef.current, time: raceStartMs };
      const nextPoints = [initial];
      pointsRef.current = nextPoints;
      setPoints(nextPoints);
    }
  }, []);

  const cancelAcquiring = useCallback(async () => {
    if (acquiringTimerRef.current) {
      clearTimeout(acquiringTimerRef.current);
      acquiringTimerRef.current = null;
    }
    setAcquiringTimeoutReached(false);
    allowAnyAccuracyRef.current = false;
    latestRawCandidateRef.current = null;

    if (watchIdRef.current !== null) {
      geolocationService.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await wakeLockService.release();
    setStatus("idle");
  }, []);

  const finishRecording = useCallback(async () => {
    if (acquiringTimerRef.current) {
      clearTimeout(acquiringTimerRef.current);
      acquiringTimerRef.current = null;
    }
    setAcquiringTimeoutReached(false);

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
    if (acquiringTimerRef.current) {
      clearTimeout(acquiringTimerRef.current);
      acquiringTimerRef.current = null;
    }
    setAcquiringTimeoutReached(false);
    allowAnyAccuracyRef.current = false;
    latestRawCandidateRef.current = null;
    setStatus("idle");
    setDurationSeconds(0);
    setDistanceMeters(0);
    setCurrentPaceSecondsPerKm(null);
    setCurrentSpeedKmh(null);
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
    currentSpeedKmh,
    gpsAccuracy,
    pointsCount: points.length,
    error,
    lastSavedRun,
    acquiringTimeoutReached,
    startRecording,
    finishRecording,
    resetRecording,
    startAnyway,
    cancelAcquiring,
  };
}
