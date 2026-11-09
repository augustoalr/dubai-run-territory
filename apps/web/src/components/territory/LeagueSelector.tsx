"use client";

import type { LeagueCode } from "@dubai-run/core";
import { useI18n } from "@/i18n";

type LeagueDefinition = {
  code: LeagueCode;
  paceRange: string;
};

const LEAGUES: LeagueDefinition[] = [
  { code: "starter", paceRange: "6:15+ /km" },
  { code: "intermediate", paceRange: "5:15 – 6:14 /km" },
  { code: "advanced", paceRange: "4:15 – 5:14 /km" },
  { code: "elite", paceRange: "< 4:15 /km" },
];

type LeagueSelectorProps = {
  currentLeague: LeagueCode;
  userLeague: LeagueCode;
  onSelectLeague: (league: LeagueCode) => void;
};

export function LeagueSelector({ currentLeague, userLeague, onSelectLeague }: LeagueSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="league-selector-wrap" role="group" aria-label={t.leagueSelectorLabel}>
      <div className="league-chips-scroll">
        {LEAGUES.map((item) => {
          const isSelected = currentLeague === item.code;
          const isUserHomeLeague = userLeague === item.code;
          const label = t.leagues[item.code];

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
                  {label}
                  {isUserHomeLeague && (
                    <span className="home-league-dot" title={t.yourCurrentLeague} />
                  )}
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
