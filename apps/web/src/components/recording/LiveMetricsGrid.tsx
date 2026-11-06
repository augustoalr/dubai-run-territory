"use client";

import { useI18n } from "@/i18n";

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
  const { t, formatDistance, formatDuration, formatPace, formatSpeed } = useI18n();

  const durationText = formatDuration(durationSeconds);
  const distanceText = formatDistance(distanceMeters);
  const currentPaceText = formatPace(currentPaceSecondsPerKm);
  const currentSpeedText = formatSpeed(currentSpeedKmh);

  return (
    <div className="live-metrics-container">
      {/* Primary Hero: Ritmo Actual */}
      <div className="metric-card metric-hero glass">
        <span className="metric-tag">{t.currentPace}</span>
        <div className="metric-number-wrap">
          <span className="metric-number hero-number">{currentPaceText}</span>
        </div>
        <span className="metric-caption">{currentSpeedText}</span>
      </div>

      {/* Secondary Metrics: Tiempo y Distancia */}
      <div className="secondary-metrics-grid">
        <div className="metric-card glass">
          <span className="metric-tag">{t.time}</span>
          <div className="metric-number-wrap">
            <span className="metric-number">{durationText}</span>
          </div>
        </div>

        <div className="metric-card glass">
          <span className="metric-tag">{t.distance}</span>
          <div className="metric-number-wrap">
            <span className="metric-number">{distanceText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
