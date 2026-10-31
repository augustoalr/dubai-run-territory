"use client";

import Link from "next/link";

export function RunsHeader() {
  return (
    <header className="runs-header glass">
      <div className="runs-header-top">
        <Link href="/" className="back-link" aria-label="Volver al mapa">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Mapa</span>
        </Link>

        <Link href="/grabar" className="runs-record-shortcut" aria-label="Grabar nueva carrera">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>Grabar</span>
        </Link>
      </div>

      <div className="runs-title-row">
        <div>
          <span className="zone-badge">Tu registro</span>
          <h1 className="runs-page-title">Mis Carreras</h1>
        </div>
      </div>
    </header>
  );
}
