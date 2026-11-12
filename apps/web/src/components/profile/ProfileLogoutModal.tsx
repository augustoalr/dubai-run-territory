"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n";

interface ProfileLogoutModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProfileLogoutModal({
  isOpen,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: ProfileLogoutModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="modal-card glass delete-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-logout-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="profile-logout-title" className="delete-modal-title">
          {t.profileLogoutModalTitle}
        </h2>
        <p className="delete-modal-desc">{t.profileLogoutModalDesc}</p>

        {errorMessage && (
          <div className="delete-modal-error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="delete-modal-actions">
          <button
            type="button"
            className="action-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.profileLogoutCancel}
          </button>
          <button
            type="button"
            className="btn-destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? t.profileLogoutLoggingOut : t.profileLogoutConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
