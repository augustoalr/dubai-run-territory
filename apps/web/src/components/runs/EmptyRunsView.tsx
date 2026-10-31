"use client";

import Link from "next/link";

export function EmptyRunsView() {
  return (
    <div className="empty-runs-card glass">
      <div className="empty-runs-icon-badge" aria-hidden="true">
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>

      <div className="empty-runs-text">
        <h2 className="empty-runs-title">Aún no tienes carreras guardadas</h2>
        <p className="empty-runs-desc">
          Sal a correr a la pista de Jumeirah Beach o Kite Beach, registra tu actividad y guárdala
          en tu teléfono.
        </p>
      </div>

      <Link href="/grabar" className="action-btn-primary empty-runs-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>Grabar mi primera carrera</span>
      </Link>
    </div>
  );
}
