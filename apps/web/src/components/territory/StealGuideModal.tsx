"use client";

import type { TerritoryCell } from "@/lib/territory/types";

type StealGuideModalProps = {
  cell: TerritoryCell | null;
  isOpen: boolean;
  onClose: () => void;
};

export function StealGuideModal({ cell, isOpen, onClose }: StealGuideModalProps) {
  if (!isOpen || !cell) return null;

  const isMine = cell.status === "mine";
  const isThreatened = cell.status === "threatened";
  const isFree = cell.status === "free";

  let title = "Cómo robar este territorio";
  let subtitle = `Supera el ritmo de ${cell.paceFormatted ?? "la zona"} para adueñarte de este sector.`;

  if (isThreatened) {
    title = "Cómo defender tu territorio";
    subtitle = `Un rival está a solo ${cell.threat?.gapSeconds ?? 2} segundos. Corre más rápido para afianzar tu liderato.`;
  } else if (isMine) {
    title = "Cómo mejorar tu marca";
    subtitle =
      "Cuanto más rápido corras este tramo, más difícil será que otro corredor te lo robe.";
  } else if (isFree) {
    title = "Cómo conquistar este territorio";
    subtitle = "Este sector no tiene dueño en tu liga. Cualquier carrera válida lo hace tuyo.";
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
            aria-label="Cerrar guía"
          >
            ✕
          </button>
        </div>

        <div className="guide-steps">
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-body">
              <h3 className="step-title">Sal a correr</h3>
              <p className="step-desc">
                Pasa por la pista de running de Jumeirah Beach / Kite Beach durante tu
                entrenamiento.
              </p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-body">
              <h3 className="step-title">Tus carreras entran solas</h3>
              <p className="step-desc">
                Conecta tu reloj <strong>Garmin</strong> o <strong>Polar</strong>, o graba
                directamente con la app. Tu actividad se procesará automáticamente al terminar.
              </p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-body">
              <h3 className="step-title">Conquista el hexágono</h3>
              <p className="step-desc">
                {isFree
                  ? "Al completar 1 km continuo dentro de la pista, el territorio pasará a ser tuyo."
                  : `Si tu ritmo medio al pasar por aquí supera los ${cell.paceFormatted ?? "anteriores"}, la celda se pintará de tu color de inmediato.`}
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="action-btn-primary" onClick={onClose}>
            ¡Entendido, a correr!
          </button>
        </div>
      </div>
    </div>
  );
}
