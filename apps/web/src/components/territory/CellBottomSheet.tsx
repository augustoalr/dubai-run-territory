"use client";

import { useI18n } from "@/i18n";
import type { TerritoryCell } from "@/lib/territory/types";

type CellBottomSheetProps = {
  cell: TerritoryCell | null;
  onClose: () => void;
  onOpenGuide: () => void;
};

export function CellBottomSheet({ cell, onClose, onOpenGuide }: CellBottomSheetProps) {
  const { t, formatDate } = useI18n();

  if (!cell) return null;

  const isMine = cell.status === "mine";
  const isThreatened = cell.status === "threatened";
  const isRival = cell.status === "rival";
  const isFree = cell.status === "free";

  const achievedDateText = cell.achievedAtIso
    ? formatDate(cell.achievedAtIso, { day: "numeric", month: "short", year: "numeric" })
    : cell.achievedAtFormatted;

  // Action button label
  let actionLabel = t.actionHowToSteal;
  if (isThreatened) {
    actionLabel = t.actionHowToDefend;
  } else if (isMine) {
    actionLabel = t.actionHowToImprove;
  } else if (isFree) {
    actionLabel = t.actionHowToConquer;
  }

  const ownerDisplayAlias = cell.owner?.alias ?? (isFree ? t.freeTerritory : t.anonymousRunner);
  const ownerInitials = isFree ? "—" : cell.owner?.alias ? cell.owner.initials : "R";

  // Friendly status message
  let statusMessage = "";
  if (isThreatened && cell.threat) {
    statusMessage = t.statusDanger(
      cell.threat.rivalAlias,
      cell.threat.rivalPaceFormatted,
      cell.threat.gapSeconds,
    );
  } else if (isThreatened) {
    statusMessage = t.statusDangerDecay;
  } else if (isMine) {
    statusMessage = t.statusMine;
  } else if (isRival && cell.gapSeconds !== null && cell.gapSeconds > 0) {
    statusMessage = t.statusRival(cell.gapSeconds, ownerDisplayAlias);
  } else if (isRival && cell.gapSeconds === 0) {
    statusMessage = t.statusRivalFaster;
  } else if (isRival && cell.paceFormatted) {
    statusMessage = t.statusRivalPace(cell.paceFormatted, ownerDisplayAlias);
  } else if (isFree) {
    statusMessage = t.statusFree;
  }

  return (
    <section className="bottom-sheet glass" role="dialog" aria-label={t.sheetAriaLabel}>
      <div className="sheet-handle" onClick={onClose} aria-hidden="true" />

      <div className="sheet-header">
        <div className="owner-profile">
          <div className={`avatar-badge ${cell.status}`}>
            <span>{ownerInitials}</span>
          </div>
          <div className="owner-meta">
            <div className="owner-alias-row">
              <span className="owner-alias">{ownerDisplayAlias}</span>
              {isMine && <span className="status-tag tag-you">{t.tagYou}</span>}
              {isThreatened && <span className="status-tag tag-threatened">{t.tagThreatened}</span>}
              {isRival && <span className="status-tag tag-rival">{t.tagRival}</span>}
              {isFree && <span className="status-tag tag-free">{t.tagFree}</span>}
            </div>
            <p className="owner-subtitle">
              {achievedDateText ? t.markFromDate(achievedDateText) : t.noOwnerRegistered}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="sheet-close-btn"
          onClick={onClose}
          aria-label={t.closeDetails}
        >
          ✕
        </button>
      </div>

      <div className="sheet-metrics-grid">
        <div className="metric-box">
          <span className="metric-label">{isFree ? t.cutoffPace : t.currentPaceMetric}</span>
          <span className="metric-value pace-hero">{cell.paceFormatted ?? t.legendFree}</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">{t.yourBestPace}</span>
          <span className="metric-value">{cell.userBestPaceFormatted ?? t.noRecord}</span>
        </div>
      </div>

      <div className="sheet-status-banner">
        <p className="status-banner-text">{statusMessage}</p>
      </div>

      <div className="sheet-actions">
        <button type="button" className="action-btn-primary" onClick={onOpenGuide}>
          <span className="btn-icon">⚡</span>
          <span>{actionLabel}</span>
        </button>
      </div>
    </section>
  );
}
