"use client";

import Link from "next/link";
import { useEffect } from "react";

interface AppMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppMenuModal({ isOpen, onClose }: AppMenuModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-menu-title"
      onClick={onClose}
    >
      <div className="modal-card glass app-menu-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-badge">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
          <div>
            <h2 id="app-menu-title" className="modal-title">
              Menú de la App
            </h2>
            <p className="modal-subtitle">Jumeirah Beach · Kite Beach</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="app-menu-nav" aria-label="Navegación legal y normas">
          <Link href="/terminos" className="menu-nav-item" onClick={onClose}>
            <div className="menu-item-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="menu-item-content">
              <span className="menu-item-title">Términos y Condiciones</span>
              <span className="menu-item-desc">
                Juego gratuito, normas de tráfico en Dubái y juego limpio sin trampas.
              </span>
            </div>
            <span className="menu-item-arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link href="/privacidad" className="menu-nav-item" onClick={onClose}>
            <div className="menu-item-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="menu-item-content">
              <span className="menu-item-title">Política de Privacidad</span>
              <span className="menu-item-desc">
                Qué datos guardamos, protección de horarios/rutas y borrado de cuenta.
              </span>
            </div>
            <span className="menu-item-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </nav>

        <div className="app-menu-info-box">
          <span className="zone-badge">Fase 0 · MVP</span>
          <p className="app-menu-info-text">
            Territorio es un juego de conquista de baldosas para la pista de running de Jumeirah
            Beach a Kite Beach. Compite en tu liga de ritmo y defiende tus sectores.
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="action-btn-primary" onClick={onClose}>
            Volver al mapa
          </button>
        </div>
      </div>
    </div>
  );
}
