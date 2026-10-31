"use client";

import type { TerritoryStats } from "@/lib/territory/types";

type StatsBarProps = {
  stats: TerritoryStats;
};

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="stats-bar-grid">
      <div className="stat-pill stat-mine">
        <span className="stat-count">{stats.mine}</span>
        <span className="stat-name">Tuyas</span>
      </div>

      <div className="stat-pill stat-threatened">
        <span className="stat-count">{stats.threatened}</span>
        <span className="stat-name">En peligro</span>
      </div>

      <div className="stat-pill stat-rival">
        <span className="stat-count">{stats.rival}</span>
        <span className="stat-name">De otros</span>
      </div>

      <div className="stat-pill stat-free">
        <span className="stat-count">{stats.free}</span>
        <span className="stat-name">Libres</span>
      </div>
    </div>
  );
}
