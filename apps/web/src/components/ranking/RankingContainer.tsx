"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeagueCode, RankedRunner } from "@dubai-run/core";
import { LeagueSelector } from "@/components/territory/LeagueSelector";
import { useI18n } from "@/i18n";
import { rankingRepository, type LeagueRankingData } from "@/lib/ranking";
import { useAuth } from "@/lib/supabase";
import { RankingCard } from "./RankingCard";
import { RankingHeader } from "./RankingHeader";
import { RankingPodium } from "./RankingPodium";
import { UserStandingBanner } from "./UserStandingBanner";

export function RankingContainer() {
  const { t } = useI18n();
  const { user, profile } = useAuth();

  const [selectedLeague, setSelectedLeague] = useState<LeagueCode>("advanced");
  const [rankingData, setRankingData] = useState<LeagueRankingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch league ranking whenever selected league changes
  useEffect(() => {
    let isCancelled = false;

    rankingRepository
      .getLeagueRanking(selectedLeague)
      .then((data) => {
        if (!isCancelled) {
          setRankingData(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedLeague]);

  const handleSelectLeague = (league: LeagueCode) => {
    setSelectedLeague(league);
    setIsLoading(true);
  };

  const runners = rankingData?.runners ?? [];
  const season = rankingData?.season ?? {
    id: "season-1",
    name: t.season,
    startsAt: "",
    endsAt: "",
    daysRemaining: 12,
    isFinished: false,
  };

  // Find if current logged-in user is ranked in this league
  const currentUserStanding: RankedRunner | null = (() => {
    if (!user || runners.length === 0) return null;
    return (
      runners.find((r) => {
        if (r.userId === user.id) return true;
        if (profile?.alias && r.alias && r.alias.toLowerCase() === profile.alias.toLowerCase()) {
          return true;
        }
        return false;
      }) ?? null
    );
  })();

  const podiumRunners = runners.slice(0, 3);
  const restRunners = runners.slice(3);

  const isUserRunner = (runner: RankedRunner): boolean => {
    if (!user) return false;
    if (runner.userId === user.id) return true;
    if (
      profile?.alias &&
      runner.alias &&
      runner.alias.toLowerCase() === profile.alias.toLowerCase()
    ) {
      return true;
    }
    return false;
  };

  return (
    <div className="ranking-page-container">
      <RankingHeader
        seasonName={season.name}
        daysRemaining={season.daysRemaining}
        isFinished={season.isFinished}
      />

      <main className="ranking-main-content">
        {/* League Selector */}
        <section className="ranking-selector-section">
          <LeagueSelector
            currentLeague={selectedLeague}
            userLeague="advanced"
            onSelectLeague={handleSelectLeague}
          />
        </section>

        {/* User Standing Banner */}
        <section className="ranking-standing-section">
          <UserStandingBanner standing={currentUserStanding} />
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="ranking-loading-state glass">
            <div className="ranking-loading-spinner" />
            <p className="ranking-loading-text">{t.loading}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && runners.length === 0 && (
          <div className="ranking-empty-state glass">
            <div className="ranking-empty-icon" aria-hidden="true">
              🏆
            </div>
            <h3 className="ranking-empty-title">{t.rankingEmptyTitle}</h3>
            <p className="ranking-empty-desc">{t.rankingEmptyDesc}</p>
            <Link href="/grabar" className="ranking-empty-btn">
              {t.rankingGoRun}
            </Link>
          </div>
        )}

        {/* Leaderboard View: Podium + Rest Cards */}
        {!isLoading && runners.length > 0 && (
          <>
            {/* Top 3 Athletic Podium */}
            <RankingPodium
              runners={podiumRunners}
              currentUserId={user?.id}
              currentUserAlias={profile?.alias}
            />

            {/* Positions 4+ */}
            {restRunners.length > 0 && (
              <section
                className="ranking-cards-section"
                aria-label="Resto de corredores clasificados"
              >
                <div className="ranking-cards-list">
                  {restRunners.map((runner) => (
                    <RankingCard
                      key={runner.userId}
                      runner={runner}
                      isCurrentUser={isUserRunner(runner)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Tiebreak Criteria Footer Note */}
            <footer className="ranking-tiebreak-footer glass">
              <div className="tiebreak-icon" aria-hidden="true">
                ℹ️
              </div>
              <p className="tiebreak-text">{t.rankingTiebreakNote}</p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
