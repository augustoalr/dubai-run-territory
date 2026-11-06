"use client";

import { useI18n } from "@/i18n";
import type { StoredRun } from "@/lib/recording/indexeddb-storage";

interface RunCardItemProps {
  run: StoredRun;
  onClick: () => void;
}

export function RunCardItem({ run, onClick }: RunCardItemProps) {
  const { t, formatDate, formatDistance, formatDuration, formatPace } = useI18n();

  const formattedDate = formatDate(run.startedAt);
  const distanceText = formatDistance(run.distanceMeters);
  const durationText = formatDuration(run.durationSeconds);
  const avgPaceText = formatPace(run.avgPaceSecondsPerKm);

  return (
    <button
      type="button"
      className="run-card-item glass"
      onClick={onClick}
      aria-label={t.viewRunDetailsAria(formattedDate)}
    >
      <div className="run-card-header">
        <span className="run-card-date">{formattedDate}</span>
        <span className="run-card-arrow" aria-hidden="true">
          →
        </span>
      </div>

      <div className="run-card-metrics">
        <div className="run-card-metric">
          <span className="run-card-metric-label">{t.distance}</span>
          <span className="run-card-metric-val">{distanceText}</span>
        </div>

        <div className="run-card-metric">
          <span className="run-card-metric-label">{t.time}</span>
          <span className="run-card-metric-val">{durationText}</span>
        </div>

        <div className="run-card-metric pace-metric">
          <span className="run-card-metric-label">{t.avgPace}</span>
          <span className="run-card-metric-val pace-val">{avgPaceText}</span>
        </div>
      </div>
    </button>
  );
}
