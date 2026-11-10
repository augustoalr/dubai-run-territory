"use client";

import type { RankedRunner } from "@dubai-run/core";
import { useI18n } from "@/i18n";
import { getInitials } from "@/lib/territory/mock-data";

interface RankingPodiumProps {
  runners: RankedRunner[];
  currentUserId?: string | null;
}

export function RankingPodium({ runners, currentUserId }: RankingPodiumProps) {
  const { t } = useI18n();

  const first = runners.length > 0 ? runners[0] : null;
  const second = runners.length > 1 ? runners[1] : null;
  const third = runners.length > 2 ? runners[2] : null;

  if (!first) {
    return null;
  }

  // Item 5: Identify the user strictly by userId
  const isCurrentUser = (runner: RankedRunner | null): boolean => {
    if (!runner || !currentUserId) return false;
    return runner.userId === currentUserId;
  };

  return (
    <section className="ranking-podium-section" aria-label={t.rankingPodiumAria}>
      <div className="ranking-podium-container">
        {/* 2nd Place (Silver) */}
        {second ? (
          <div
            className={`podium-column column-second ${
              isCurrentUser(second) ? "is-current-user" : ""
            }`}
          >
            <div className="podium-runner-card">
              <div className="podium-medal-badge silver" title={t.rankingPodiumSecond}>
                🥈
              </div>
              <div className="podium-avatar silver">{getInitials(second.alias)}</div>
              <span className="podium-alias" title={second.alias ?? t.anonymousRunner}>
                {second.alias ?? t.anonymousRunner}
              </span>
              <div className="podium-score">
                <span className="podium-points">{second.points}</span>
                <span className="podium-points-unit">{t.rankingPointsSuffix}</span>
              </div>
              <div className="podium-submetrics">
                <span>{t.rankingCellsCount(second.cellsOwned)}</span>
                <span>·</span>
                <span>
                  {second.distanceInZoneKm} {t.rankingKmUnit}
                </span>
              </div>
            </div>
            <div className="podium-pedestal pedestal-second">
              <div className="pedestal-rank">#2</div>
              <div className="pedestal-sheen" />
            </div>
          </div>
        ) : (
          <div className="podium-column-placeholder" />
        )}

        {/* 1st Place (Gold, Champion) */}
        {first && (
          <div
            className={`podium-column column-first ${
              isCurrentUser(first) ? "is-current-user" : ""
            }`}
          >
            <div className="podium-runner-card first-card">
              <div className="podium-crown-icon" aria-hidden="true">
                👑
              </div>
              <div className="podium-medal-badge gold" title={t.rankingPodiumFirst}>
                🥇
              </div>
              <div className="podium-avatar gold">{getInitials(first.alias)}</div>
              <span className="podium-alias first-alias" title={first.alias ?? t.anonymousRunner}>
                {first.alias ?? t.anonymousRunner}
              </span>
              <div className="podium-score first-score">
                <span className="podium-points">{first.points}</span>
                <span className="podium-points-unit">{t.rankingPointsSuffix}</span>
              </div>
              <div className="podium-submetrics">
                <span>{t.rankingCellsCount(first.cellsOwned)}</span>
                <span>·</span>
                <span>
                  {first.distanceInZoneKm} {t.rankingKmUnit}
                </span>
              </div>
            </div>
            <div className="podium-pedestal pedestal-first">
              <div className="pedestal-rank">#1</div>
              <div className="pedestal-sheen" />
            </div>
          </div>
        )}

        {/* 3rd Place (Bronze) */}
        {third ? (
          <div
            className={`podium-column column-third ${
              isCurrentUser(third) ? "is-current-user" : ""
            }`}
          >
            <div className="podium-runner-card">
              <div className="podium-medal-badge bronze" title={t.rankingPodiumThird}>
                🥉
              </div>
              <div className="podium-avatar bronze">{getInitials(third.alias)}</div>
              <span className="podium-alias" title={third.alias ?? t.anonymousRunner}>
                {third.alias ?? t.anonymousRunner}
              </span>
              <div className="podium-score">
                <span className="podium-points">{third.points}</span>
                <span className="podium-points-unit">{t.rankingPointsSuffix}</span>
              </div>
              <div className="podium-submetrics">
                <span>{t.rankingCellsCount(third.cellsOwned)}</span>
                <span>·</span>
                <span>
                  {third.distanceInZoneKm} {t.rankingKmUnit}
                </span>
              </div>
            </div>
            <div className="podium-pedestal pedestal-third">
              <div className="pedestal-rank">#3</div>
              <div className="pedestal-sheen" />
            </div>
          </div>
        ) : (
          <div className="podium-column-placeholder" />
        )}
      </div>
    </section>
  );
}
