"use client";

import { useI18n } from "@/i18n";
import type { TerritoryCell } from "@/lib/territory/types";

type StealGuideModalProps = {
  cell: TerritoryCell | null;
  isOpen: boolean;
  onClose: () => void;
};

export function StealGuideModal({ cell, isOpen, onClose }: StealGuideModalProps) {
  const { t } = useI18n();

  if (!isOpen || !cell) return null;

  const isMine = cell.status === "mine";
  const isThreatened = cell.status === "threatened";
  const isFree = cell.status === "free";

  let title = t.guideTitleSteal;
  let subtitle = t.guideSubtitleSteal(cell.paceFormatted ?? t.zoneEyebrow);

  if (isThreatened) {
    title = t.guideTitleDefend;
    subtitle = cell.threat
      ? t.guideSubtitleDefend(cell.threat.gapSeconds)
      : t.guideSubtitleDefendDecay;
  } else if (isMine) {
    title = t.guideTitleImprove;
    subtitle = t.guideSubtitleImprove;
  } else if (isFree) {
    title = t.guideTitleConquer;
    subtitle = t.guideSubtitleConquer;
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="steal-guide-title"
      onClick={onClose}
    >
      <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-badge">
            <span className="trophy-icon">⚡</span>
          </div>
          <div>
            <h2 id="steal-guide-title" className="modal-title">
              {title}
            </h2>
            <p className="modal-subtitle">{subtitle}</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t.guideCloseAria}
          >
            ✕
          </button>
        </div>

        <div className="guide-steps">
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-body">
              <h3 className="step-title">{t.step1Title}</h3>
              <p className="step-desc">{t.step1Desc}</p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-body">
              <h3 className="step-title">{t.step2Title}</h3>
              <p className="step-desc">{t.step2Desc}</p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-body">
              <h3 className="step-title">{t.step3Title}</h3>
              <p className="step-desc">{isFree ? t.step3DescFree : t.step3DescBeat}</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="action-btn-primary" onClick={onClose}>
            {t.guideUnderstood}
          </button>
        </div>
      </div>
    </div>
  );
}
