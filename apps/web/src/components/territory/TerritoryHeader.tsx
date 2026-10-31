"use client";

import type { LeagueCode } from "@dubai-run/core";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import type { TerritoryStats } from "@/lib/territory/types";
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
  return (
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
  );
}
