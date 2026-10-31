"use client";

import { formatDisplayDistance, formatDisplayDuration, formatDisplayPace } from "@dubai-run/core";
import type { StoredRun } from "@/lib/recording/indexeddb-storage";

interface RunCardItemProps {
  run: StoredRun;
  onClick: () => void;
}

export function RunCardItem({ run, onClick }: RunCardItemProps) {
  const startDate = new Date(run.startedAt);
  const formattedDate = !Number.isNaN(startDate.getTime())
    ? startDate.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Fecha no disponible";

  const distanceText = formatDisplayDistance(run.distanceMeters);
  const durationText = formatDisplayDuration(run.durationSeconds);
  const avgPaceText = formatDisplayPace(run.avgPaceSecondsPerKm);

  return (
    <button
      type="button"
      className="run-card-item glass"
      onClick={onClick}
      aria-label={`Ver detalles de la carrera del ${formattedDate}`}
    >
      <div className="run-card-header">
        <span className="run-card-date">{formattedDate}</span>
        <span className="run-card-arrow" aria-hidden="true">
          →
        </span>
      </div>

      <div className="run-card-metrics">
        <div className="run-card-metric">
          <span className="run-card-metric-label">Distancia</span>
          <span className="run-card-metric-val">{distanceText}</span>
        </div>

        <div className="run-card-metric">
          <span className="run-card-metric-label">Tiempo</span>
          <span className="run-card-metric-val">{durationText}</span>
        </div>

        <div className="run-card-metric pace-metric">
          <span className="run-card-metric-label">Ritmo medio</span>
          <span className="run-card-metric-val pace-val">{avgPaceText}</span>
        </div>
      </div>
    </button>
  );
}
