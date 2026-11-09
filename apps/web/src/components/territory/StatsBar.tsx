"use client";

import { useI18n } from "@/i18n";
import type { TerritoryStats } from "@/lib/territory/types";

type StatsBarProps = {
  stats: TerritoryStats;
};

export function StatsBar({ stats }: StatsBarProps) {
  const { t } = useI18n();

  return (
    <div className="stats-bar-grid">
      <div className="stat-pill stat-mine">
        <span className="stat-count">{stats.mine}</span>
        <span className="stat-name">{t.statMine}</span>
      </div>

      <div className="stat-pill stat-threatened">
        <span className="stat-count">{stats.threatened}</span>
        <span className="stat-name">{t.statThreatened}</span>
      </div>

      <div className="stat-pill stat-rival">
        <span className="stat-count">{stats.rival}</span>
        <span className="stat-name">{t.statRival}</span>
      </div>

      <div className="stat-pill stat-free">
        <span className="stat-count">{stats.free}</span>
        <span className="stat-name">{t.statFree}</span>
      </div>
    </div>
  );
}
