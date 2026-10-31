"use client";

import { formatDisplayDistance, formatDisplayDuration, formatDisplayPace } from "@dubai-run/core";
import { useCallback, useState } from "react";
import type { StoredRun } from "@/lib/recording/indexeddb-storage";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { RunMiniMap } from "./RunMiniMap";

interface RunDetailModalProps {
  run: StoredRun | null;
  theme?: ThemeMode;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function RunDetailModal({ run, theme = "dark", onClose, onDelete }: RunDetailModalProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDownload = useCallback(() => {
    if (!run) return;
    const blob = new Blob([run.gpx], { type: "application/gpx+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${run.id}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [run]);

  const handleOpenDelete = () => {
    setDeleteError(null);
    setIsConfirmingDelete(true);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDeleteError(null);
    setIsConfirmingDelete(false);
  };

  const handleConfirmDelete = async () => {
    if (!run || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(run.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch {
      setDeleteError("No se pudo borrar la carrera. Inténtalo de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!run) return null;

  const startDate = new Date(run.startedAt);
  const formattedDate = !Number.isNaN(startDate.getTime())
    ? startDate.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Fecha no disponible";

  const distanceText = formatDisplayDistance(run.distanceMeters);
  const durationText = formatDisplayDuration(run.durationSeconds);
  const avgPaceText = formatDisplayPace(run.avgPaceSecondsPerKm);

  return (
    <>
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-detail-title"
        onClick={onClose}
      >
        <div className="modal-card glass run-detail-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <div>
              <span className="zone-badge">{formattedDate}</span>
              <h2 id="run-detail-title" className="modal-title">
                {run.name || "Resumen de carrera"}
              </h2>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Cerrar detalle"
            >
              ✕
            </button>
          </div>

          {/* Mini Map showing the track */}
          <div className="run-detail-map-box">
            <RunMiniMap gpx={run.gpx} theme={theme} />
          </div>

          {/* Metrics summary */}
          <div className="run-detail-metrics-grid">
            <div className="metric-box glass">
              <span className="metric-label">Distancia</span>
              <span className="metric-value">{distanceText}</span>
            </div>

            <div className="metric-box glass">
              <span className="metric-label">Tiempo</span>
              <span className="metric-value">{durationText}</span>
            </div>

            <div className="metric-box glass col-span-full">
              <span className="metric-label">Ritmo medio</span>
              <span className="metric-value pace-hero">{avgPaceText}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="run-detail-actions">
            <button
              type="button"
              className="action-btn-primary"
              onClick={handleDownload}
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

            <button
              type="button"
              className="btn-delete-trigger"
              onClick={handleOpenDelete}
              disabled={isDeleting}
              aria-label="Borrar carrera"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Borrar carrera</span>
            </button>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={isConfirmingDelete}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
