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
  const { user } = useAuth();

  // Item 5: Default league is the first league ("starter"), unless user has an assigned league
  const [selectedLeague, setSelectedLeague] = useState<LeagueCode>("starter");
  const [userLeague, setUserLeague] = useState<LeagueCode>("starter");
  const [rankingData, setRankingData] = useState<LeagueRankingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  // Item 5: Fetch user's actual league if logged in
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    rankingRepository
      .getUserLeague(user.id)
      .then((league) => {
        if (!isCancelled && league) {
          setUserLeague(league);
          setSelectedLeague(league);
        }
      })
      .catch(() => {
        // Degrade gracefully without blocking UI
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Fetch league ranking whenever selected league or reload trigger changes
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
          setRankingData({
            league: selectedLeague,
            season: null,
            runners: [],
            isSampleData: false,
            error: "network_error",
          });
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedLeague, reloadTrigger]);

  const handleSelectLeague = (league: LeagueCode) => {
    setSelectedLeague(league);
    setIsLoading(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const runners = rankingData?.runners ?? [];
  const season = rankingData?.season ?? null;
  const isSampleData = Boolean(rankingData?.isSampleData);
  const isNetworkError = rankingData?.error === "network_error";

  // Item 5: Identify current user strictly by userId (never by alias)
  const currentUserStanding: RankedRunner | null = (() => {
    if (!user || runners.length === 0) return null;
    return runners.find((r) => r.userId === user.id) ?? null;
  })();

  const podiumRunners = runners.slice(0, 3);
  const restRunners = runners.slice(3);

  // Item 5: Strictly match by userId
  const isUserRunner = (runner: RankedRunner): boolean => {
    if (!user) return false;
    return runner.userId === user.id;
  };

  return (
    <div className="ranking-page-container">
      {/* Item 5: No invented daysRemaining: pass actual days or null */}
      <RankingHeader
        seasonName={season ? season.name : t.season}
        daysRemaining={season ? season.daysRemaining : null}
        isFinished={season ? season.isFinished : false}
        isSampleData={isSampleData}
      />

      <main className="ranking-main-content">
        {/* League Selector */}
        <section className="ranking-selector-section">
          <LeagueSelector
            currentLeague={selectedLeague}
            userLeague={userLeague}
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

        {/* Item 2: Network error state with retry button */}
        {!isLoading && isNetworkError && (
          <div className="ranking-error-state glass">
            <div className="ranking-error-icon" aria-hidden="true">
              ⚠️
            </div>
            <h3 className="ranking-error-title">{t.rankingErrorTitle}</h3>
            <p className="ranking-error-desc">{t.rankingErrorDesc}</p>
            <button type="button" className="ranking-retry-btn" onClick={handleRetry}>
              {t.retry}
            </button>
          </div>
        )}

        {/* Item 2 & 4: Empty State when no classified runners exist */}
        {!isLoading && !isNetworkError && runners.length === 0 && (
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
        {!isLoading && !isNetworkError && runners.length > 0 && (
          <>
            {/* Top 3 Athletic Podium */}
            <RankingPodium runners={podiumRunners} currentUserId={user?.id} />

            {/* Item 6: i18n aria-label */}
            {restRunners.length > 0 && (
              <section className="ranking-cards-section" aria-label={t.rankingOtherRunnersAria}>
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
