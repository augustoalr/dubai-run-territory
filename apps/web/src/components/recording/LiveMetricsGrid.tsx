"use client";

import {
  formatDisplayDistance,
  formatDisplayDuration,
  formatDisplayPace,
  formatDisplaySpeed,
} from "@dubai-run/core";

interface LiveMetricsGridProps {
  durationSeconds: number;
  distanceMeters: number;
  currentPaceSecondsPerKm: number | null;
  currentSpeedKmh?: number | null;
}

export function LiveMetricsGrid({
  durationSeconds,
  distanceMeters,
  currentPaceSecondsPerKm,
  currentSpeedKmh,
}: LiveMetricsGridProps) {
  const durationText = formatDisplayDuration(durationSeconds);
  const distanceText = formatDisplayDistance(distanceMeters);
  const currentPaceText = formatDisplayPace(currentPaceSecondsPerKm);
  const currentSpeedText = formatDisplaySpeed(currentSpeedKmh);

  return (
    <div className="live-metrics-container">
      {/* Primary Hero: Ritmo Actual */}
      <div className="metric-card metric-hero glass">
        <span className="metric-tag">Ritmo actual</span>
        <div className="metric-number-wrap">
          <span className="metric-number hero-number">{currentPaceText}</span>
        </div>
        <span className="metric-caption">{currentSpeedText}</span>
      </div>

      {/* Secondary Metrics: Tiempo y Distancia */}
      <div className="secondary-metrics-grid">
        <div className="metric-card glass">
          <span className="metric-tag">Tiempo</span>
          <div className="metric-number-wrap">
            <span className="metric-number">{durationText}</span>
          </div>
        </div>

        <div className="metric-card glass">
          <span className="metric-tag">Distancia</span>
          <div className="metric-number-wrap">
            <span className="metric-number">{distanceText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
