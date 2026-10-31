"use client";

import type { TerritoryCell } from "@/lib/territory/types";

type CellBottomSheetProps = {
  cell: TerritoryCell | null;
  onClose: () => void;
  onOpenGuide: () => void;
};

export function CellBottomSheet({ cell, onClose, onOpenGuide }: CellBottomSheetProps) {
  if (!cell) return null;

  const isMine = cell.status === "mine";
  const isThreatened = cell.status === "threatened";
  const isRival = cell.status === "rival";
  const isFree = cell.status === "free";

  // Action button label
  let actionLabel = "Cómo robarla";
  if (isThreatened) {
    actionLabel = "Cómo defenderla";
  } else if (isMine) {
    actionLabel = "Cómo mejorar tu marca";
  } else if (isFree) {
    actionLabel = "Cómo conquistarla";
  }

  // Friendly status message
  let statusMessage = "";
  if (isThreatened && cell.threat) {
    statusMessage = `⚠️ ¡En peligro! ${cell.threat.rivalAlias} corrió a ${cell.threat.rivalPaceFormatted} (a solo ${cell.threat.gapSeconds} seg/km de robarte).`;
  } else if (isMine) {
    statusMessage = "¡Eres el dueño actual de esta sección de la pista!";
  } else if (isRival && cell.gapSeconds !== null) {
    statusMessage = `Te faltan solo ${cell.gapSeconds} segundos por km para superar a ${cell.owner?.alias ?? "este corredor"}.`;
  } else if (isFree) {
    statusMessage = "Nadie ha reclamado esta baldosa en tu liga todavía. ¡Sé el primero!";
  }

  return (
    <section
      className="bottom-sheet glass"
      role="dialog"
      aria-label="Detalles del territorio seleccionado"
    >
      <div className="sheet-handle" onClick={onClose} aria-hidden="true" />

      <div className="sheet-header">
        <div className="owner-profile">
          <div className={`avatar-badge ${cell.status}`}>
            <span>{isFree ? "—" : (cell.owner?.initials ?? "??")}</span>
          </div>
          <div className="owner-meta">
            <div className="owner-alias-row">
              <span className="owner-alias">{isFree ? "Territorio libre" : cell.owner?.alias}</span>
              {isMine && <span className="status-tag tag-you">Tú</span>}
              {isThreatened && <span className="status-tag tag-threatened">En peligro</span>}
              {isRival && <span className="status-tag tag-rival">Rival</span>}
              {isFree && <span className="status-tag tag-free">Disponible</span>}
            </div>
            <p className="owner-subtitle">
              {cell.achievedAtFormatted
                ? `Marca del ${cell.achievedAtFormatted}`
                : "Sin dueño registrado"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="sheet-close-btn"
          onClick={onClose}
          aria-label="Cerrar detalles"
        >
          ✕
        </button>
      </div>

      <div className="sheet-metrics-grid">
        <div className="metric-box">
          <span className="metric-label">{isFree ? "Ritmo de corte" : "Ritmo actual"}</span>
          <span className="metric-value pace-hero">{cell.paceFormatted ?? "Libre"}</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Tu mejor ritmo</span>
          <span className="metric-value">{cell.userBestPaceFormatted ?? "Sin registro"}</span>
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
