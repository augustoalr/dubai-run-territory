"use client";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ isOpen, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      onClick={onCancel}
    >
      <div className="modal-card glass delete-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon" aria-hidden="true">
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
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>

        <h3 id="delete-confirm-title" className="delete-modal-title">
          ¿Borrar carrera?
        </h3>
        <p className="delete-modal-desc">
          Esta acción no se puede deshacer. Se eliminará la carrera de este teléfono.
        </p>

        <div className="delete-modal-actions">
          <button type="button" className="action-btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn-destructive" onClick={onConfirm}>
            Sí, borrar carrera
          </button>
        </div>
      </div>
    </div>
  );
}
