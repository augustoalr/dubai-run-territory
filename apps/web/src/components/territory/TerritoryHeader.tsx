"use client";

import { useState } from "react";
import type { LeagueCode } from "@dubai-run/core";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/supabase";
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
  const { t } = useI18n();
  const { user, profile, openAuthModal } = useAuth();

  return (
    <>
      <header className="territory-header glass">
        <div className="header-top-row">
          <div>
            <div className="brand-zone-row">
              <span className="zone-badge">{t.zoneName}</span>
              <span className="season-pill">{t.season}</span>
            </div>
            <h1 className="brand-wordmark">{t.appName}</h1>
          </div>

          <div className="header-actions">
            {user ? (
              <button
                type="button"
                className="header-user-button"
                onClick={() => setIsMenuOpen(true)}
                aria-label={profile?.alias ?? t.userAccount}
                title={profile?.alias ?? t.userAccount}
              >
                <span className="header-user-avatar">
                  {profile?.alias ? profile.alias[0].toUpperCase() : "R"}
                </span>
                <span className="header-user-alias">{profile?.alias ?? t.anonymousRunner}</span>
              </button>
            ) : (
              <button
                type="button"
                className="header-auth-button"
                onClick={openAuthModal}
                aria-label={t.login}
                title={t.login}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="header-auth-label">{t.login}</span>
              </button>
            )}

            <button
              type="button"
              className="header-menu-button"
              onClick={() => setIsMenuOpen(true)}
              aria-label={t.openMenu}
              title={t.openMenu}
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
              <span className="header-menu-label">{t.menu}</span>
            </button>

            <LocaleToggle />
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
