"use client";

import type { RecorderStatus } from "@/lib/recording/use-runner-recorder";

interface RecordingControlsProps {
  status: RecorderStatus;
  onStart: () => void;
  onFinish: () => void;
}

export function RecordingControls({ status, onStart, onFinish }: RecordingControlsProps) {
  if (status === "idle") {
    return (
      <div className="recording-controls">
        <button
          type="button"
          className="btn-start-run"
          onClick={onStart}
          aria-label="Empezar carrera"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>Empezar carrera</span>
        </button>
      </div>
    );
  }

  if (status === "acquiring" || status === "recording") {
    return (
      <div className="recording-controls">
        <button
          type="button"
          className="btn-finish-run"
          onClick={onFinish}
          aria-label="Terminar carrera"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="5" y="5" width="14" height="14" rx="2" ry="2" />
          </svg>
          <span>Terminar</span>
        </button>
      </div>
    );
  }

  return null;
}
