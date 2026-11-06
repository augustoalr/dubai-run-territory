"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/i18n";
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
  const { t, formatDate, formatDistance, formatDuration, formatPace } = useI18n();
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
      setDeleteError(t.deleteRunError);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!run) return null;

  const formattedDate = formatDate(run.startedAt, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const distanceText = formatDistance(run.distanceMeters);
  const durationText = formatDuration(run.durationSeconds);
  const avgPaceText = formatPace(run.avgPaceSecondsPerKm);

  return (
    <>
      <div
        className="modal-backdrop run-detail-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-detail-title"
        onClick={onClose}
      >
        <div className="modal-card glass run-detail-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header run-detail-header">
            <div className="run-detail-header-text">
              <span className="zone-badge">{formattedDate}</span>
              <h2 id="run-detail-title" className="modal-title">
                {run.name || t.runSummaryDefaultTitle}
              </h2>
            </div>
            <button
              type="button"
              className="modal-close-btn run-detail-close-btn"
              onClick={onClose}
              aria-label={t.closeRunDetail}
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
              <span className="metric-label">{t.distance}</span>
              <span className="metric-value">{distanceText}</span>
            </div>

            <div className="metric-box glass">
              <span className="metric-label">{t.time}</span>
              <span className="metric-value">{durationText}</span>
            </div>

            <div className="metric-box glass col-span-full">
              <span className="metric-label">{t.avgPace}</span>
              <span className="metric-value pace-hero">{avgPaceText}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="run-detail-actions">
            <button
              type="button"
              className="action-btn-primary btn-download-run"
              onClick={handleDownload}
              aria-label={t.downloadRunFile}
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
                className="btn-download-icon"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="btn-download-text">{t.downloadRunFile}</span>
            </button>

            <button
              type="button"
              className="btn-delete-run btn-delete-trigger"
              onClick={handleOpenDelete}
              disabled={isDeleting}
              aria-label={t.deleteRun}
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
              <span>{t.deleteRun}</span>
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
