"use client";

import type { LeagueCode } from "@dubai-run/core";

type LeagueMeta = {
  code: LeagueCode;
  label: string;
  paceRange: string;
};

const LEAGUES: LeagueMeta[] = [
  { code: "starter", label: "Inicial", paceRange: "6:15+ /km" },
  { code: "intermediate", label: "Intermedio", paceRange: "5:15 – 6:14 /km" },
  { code: "advanced", label: "Avanzado", paceRange: "4:15 – 5:14 /km" },
  { code: "elite", label: "Élite", paceRange: "< 4:15 /km" },
];

type LeagueSelectorProps = {
  currentLeague: LeagueCode;
  userLeague: LeagueCode;
  onSelectLeague: (league: LeagueCode) => void;
};

export function LeagueSelector({ currentLeague, userLeague, onSelectLeague }: LeagueSelectorProps) {
  return (
    <div className="league-selector-wrap" role="group" aria-label="Selector de ligas de carrera">
      <div className="league-chips-scroll">
        {LEAGUES.map((item) => {
          const isSelected = currentLeague === item.code;
          const isUserHomeLeague = userLeague === item.code;

          return (
            <button
              key={item.code}
              type="button"
              className={`league-chip ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectLeague(item.code)}
              aria-pressed={isSelected}
            >
              <div className="chip-content">
                <span className="chip-title">
                  {item.label}
                  {isUserHomeLeague && <span className="home-league-dot" title="Tu liga actual" />}
                </span>
                <span className="chip-pace">{item.paceRange}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
