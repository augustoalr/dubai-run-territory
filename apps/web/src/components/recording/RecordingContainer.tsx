"use client";

import { useState } from "react";
import { useRunnerRecorder } from "@/lib/recording/use-runner-recorder";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import { LiveMetricsGrid } from "./LiveMetricsGrid";
import { RecordingControls } from "./RecordingControls";
import { RecordingHeader } from "./RecordingHeader";
import { RunSummaryCard } from "./RunSummaryCard";
import { WakeLockBanner } from "./WakeLockBanner";

export function RecordingContainer() {
  const [theme] = useState<ThemeMode>(() => {
    if (typeof document === "undefined") return "dark";
    return (document.documentElement.getAttribute("data-theme") as ThemeMode) || "dark";
  });

  const {
    status,
    durationSeconds,
    distanceMeters,
    currentPaceSecondsPerKm,
    gpsAccuracy,
    error,
    lastSavedRun,
    startRecording,
    finishRecording,
    resetRecording,
  } = useRunnerRecorder();

  const isRecording = status === "recording" || status === "acquiring";

  return (
    <main className="recording-viewport" data-theme={theme}>
      <div className="recording-vignette" />

      <div className="recording-content-wrapper">
        <RecordingHeader status={status} gpsAccuracy={gpsAccuracy} />

        <div className="recording-body">
          {status === "finished" && lastSavedRun ? (
            <RunSummaryCard run={lastSavedRun} onReset={resetRecording} />
          ) : (
            <>
              <WakeLockBanner isRecording={isRecording} />

              {status === "error" && error && (
                <div className="recording-error-card glass" role="alert">
                  <div className="error-icon" aria-hidden="true">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="error-title">No se pudo acceder al GPS</h3>
                    <p className="error-desc">{error}</p>
                  </div>
                  <button
                    type="button"
                    className="action-btn-primary error-retry-btn"
                    onClick={startRecording}
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {status === "acquiring" && (
                <div className="gps-acquiring-banner glass" aria-live="polite">
                  <span className="spinner-dot" />
                  <span>Obteniendo señal GPS con alta precisión...</span>
                </div>
              )}

              <LiveMetricsGrid
                durationSeconds={durationSeconds}
                distanceMeters={distanceMeters}
                currentPaceSecondsPerKm={currentPaceSecondsPerKm}
              />

              <RecordingControls
                status={status}
                onStart={startRecording}
                onFinish={finishRecording}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
