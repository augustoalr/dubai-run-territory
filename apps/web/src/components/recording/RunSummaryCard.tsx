"use client";

import { formatDisplayDistance, formatDisplayDuration, formatDisplayPace } from "@dubai-run/core";
import Link from "next/link";
import { useCallback } from "react";
import type { StoredRun } from "@/lib/recording/indexeddb-storage";

interface RunSummaryCardProps {
  run: StoredRun;
  onReset: () => void;
}

export function RunSummaryCard({ run, onReset }: RunSummaryCardProps) {
  const durationText = formatDisplayDuration(run.durationSeconds);
  const distanceText = formatDisplayDistance(run.distanceMeters);
  const avgPaceText = formatDisplayPace(run.avgPaceSecondsPerKm);

  const handleDownloadGpx = useCallback(() => {
    const blob = new Blob([run.gpx], { type: "application/gpx+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${run.id}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [run.gpx, run.id]);

  return (
    <div className="run-summary-card glass">
      <div className="summary-header">
        <div className="summary-icon-badge" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div>
          <h2 className="summary-title">¡Carrera terminada!</h2>
          <p className="summary-subtitle">Guardada en este teléfono</p>
        </div>
      </div>

      <div className="summary-metrics-grid">
        <div className="summary-metric-box glass">
          <span className="summary-metric-label">Distancia</span>
          <span className="summary-metric-value">{distanceText}</span>
        </div>

        <div className="summary-metric-box glass">
          <span className="summary-metric-label">Tiempo</span>
          <span className="summary-metric-value">{durationText}</span>
        </div>

        <div className="summary-metric-box glass col-span-full">
          <span className="summary-metric-label">Ritmo medio</span>
          <span className="summary-metric-value pace-highlight">{avgPaceText}</span>
        </div>
      </div>

      <div className="summary-notice-box">
        <span className="zone-badge">Guardado local</span>
        <p className="summary-notice-text">Por ahora tu carrera se guarda solo en este teléfono.</p>
      </div>

      <div className="summary-actions">
        <button
          type="button"
          className="btn-download-gpx"
          onClick={handleDownloadGpx}
          aria-label="Descargar archivo de la carrera"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Descargar archivo de la carrera</span>
        </button>

        <Link href="/carreras" className="action-btn-secondary summary-runs-btn">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>Mis carreras</span>
        </Link>

        <div className="summary-nav-row">
          <button type="button" className="action-btn-secondary" onClick={onReset}>
            Grabar otra carrera
          </button>
          <Link href="/" className="action-btn-primary">
            Volver al mapa
          </Link>
        </div>
      </div>
    </div>
  );
}
