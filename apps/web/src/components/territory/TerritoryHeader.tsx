"use client";

import { useState } from "react";
import type { LeagueCode } from "@dubai-run/core";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import type { TerritoryStats } from "@/lib/territory/types";
import { AppMenuModal } from "./AppMenuModal";
import { LeagueSelector } from "./LeagueSelector";
import { StatsBar } from "./StatsBar";
import { ThemeToggle } from "./ThemeToggle";

type TerritoryHeaderProps = {
  currentLeague: LeagueCode;
  userLeague: LeagueCode;
  stats: TerritoryStats;
  theme: ThemeMode;
  onSelectLeague: (league: LeagueCode) => void;
  onToggleTheme: () => void;
};

export function TerritoryHeader({
  currentLeague,
  userLeague,
  stats,
  theme,
  onSelectLeague,
  onToggleTheme,
}: TerritoryHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="territory-header glass">
        <div className="header-top-row">
          <div>
            <div className="brand-zone-row">
              <span className="zone-badge">Jumeirah · Kite Beach</span>
              <span className="season-pill">Temporada 1</span>
            </div>
            <h1 className="brand-wordmark">Territorio</h1>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="header-menu-button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Abrir menú y enlaces legales"
              title="Menú y términos legales"
            >
              <svg
                width="19"
                height="19"
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
              <span className="header-menu-label">Menú</span>
            </button>

            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>

        <div className="header-leagues-row">
          <LeagueSelector
            currentLeague={currentLeague}
            userLeague={userLeague}
            onSelectLeague={onSelectLeague}
          />
        </div>

        <div className="header-stats-row">
          <StatsBar stats={stats} />
        </div>
      </header>

      <AppMenuModal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
